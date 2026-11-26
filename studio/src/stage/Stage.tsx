// The stage engine: plays a Film (sets + shots + cast + words) as a Remotion composition.
// One three.js scene, plain Lambert shading, inverted-hull ink and painted textures: no post-processing passes, so it
// renders on a CPU-only machine at full 1080x1920 (see docs/rendering.md). Captions and the grade are DOM layers.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { Cam, whip } from "./camera";
import { MOODS, Mood, MoodName } from "./moods";
import { Look, PH, PW, Pose, RH, RW, Rat, drawPerson, drawRat } from "./chars";
import { V3, ctex } from "./util";
import { blob } from "./paint";
import { Captions, Word } from "./Captions";

export type CastItem =
  | { kind: "person"; id: string; look: Look; pose: Pose; at: V3; h?: number; flip?: boolean; shadow?: boolean }
  | { kind: "rat"; id: string; rat: Rat; at: V3; s?: number; flip?: boolean; roll?: number; shadow?: boolean }
  | { kind: "card"; id: string; tex: THREE.Texture; at: V3; w: number; h: number; roll?: number; add?: boolean; opacity?: number; flat?: boolean };
export type SetDef = { root: THREE.Object3D; tick?: (f: number) => void };
export type Shot = {
  a: number; b: number; set: string; mood: MoodName;
  cam: (f: number) => Cam;
  cast?: (f: number) => CastItem[];
  into?: "cut" | "whip" | "dip" | "flash"; // how this shot is entered (default cut)
};
export type Film = { total: number; sets: Record<string, () => SetDef>; shots: Shot[]; words: Word[]; captions?: boolean };

const skyTex = (m: Mood, key: string) => ctex(`sky${key}`, 16, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, m.sky[0]); gr.addColorStop(0.5, m.sky[1]); gr.addColorStop(0.78, m.sky[2]); gr.addColorStop(1, m.sky[2]);
  g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
  if (m.stars) { g.fillStyle = "#ffffff"; for (let i = 0; i < 26; i++) g.fillRect((i * 7.3) % 16, (i * 37.7) % 300, 1, 1); }
});

type Card = { mesh: THREE.Mesh; sh: THREE.Mesh; canvas?: HTMLCanvasElement; tex?: THREE.CanvasTexture; key: string };
class Engine {
  sets = new Map<string, SetDef>();
  cards = new Map<string, Card>();
  ratTex = new Map<string, THREE.CanvasTexture>();
  amb = new THREE.AmbientLight(); sun = new THREE.DirectionalLight(); fog = new THREE.Fog("#fff", 10, 100);
  castRoot = new THREE.Group();
  constructor(private film: Film, private scene: THREE.Scene) {
    scene.add(this.amb, this.sun, this.sun.target, this.castRoot); scene.fog = this.fog;
    // real cast shadows from the key light (props and sets); the 2D cast keeps its soft contact blobs
    const sh = this.sun.shadow; this.sun.castShadow = true; sh.mapSize.set(2048, 2048); sh.bias = -0.0006; sh.normalBias = 0.03; sh.radius = 5;
    const oc = sh.camera; oc.left = -9; oc.right = 9; oc.top = 9; oc.bottom = -9; oc.near = 1; oc.far = 80; oc.updateProjectionMatrix();
  }
  private set(name: string) {
    let s = this.sets.get(name);
    if (!s) { s = this.film.sets[name](); this.sets.set(name, s); this.scene.add(s.root); }
    for (const [k, v] of this.sets) v.root.visible = k === name;
    return s;
  }
  private card(id: string, kind: string): Card {
    let c = this.cards.get(id);
    if (!c) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, alphaTest: 0.02 });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); mesh.renderOrder = 5;
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blob("#120a1c"), transparent: true, depthWrite: false, opacity: 0.5 })); sh.renderOrder = 3;
      c = { mesh, sh, key: "" };
      if (kind === "person") { c.canvas = document.createElement("canvas"); c.canvas.width = PW; c.canvas.height = PH; c.tex = new THREE.CanvasTexture(c.canvas); c.tex.colorSpace = THREE.SRGBColorSpace; c.tex.anisotropy = 4; mat.map = c.tex; }
      this.castRoot.add(mesh, sh); this.cards.set(id, c);
    }
    return c;
  }
  private rat(r: Rat) {
    const q = { ...r, phase: Math.round((((r.phase ?? 0) % (Math.PI * 2)) + Math.PI * 2) / (Math.PI / 4)) % 8 * (Math.PI / 4) }, k = JSON.stringify(q);
    let t = this.ratTex.get(k);
    if (!t) { const c = document.createElement("canvas"); c.width = RW; c.height = RH; drawRat(c.getContext("2d")!, q); t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; this.ratTex.set(k, t); }
    return t;
  }
  update(f: number, cam: THREE.PerspectiveCamera, aspect: number) {
    const shots = this.film.shots, i = Math.max(0, shots.findIndex((s) => f >= s.a && f < s.b)), shot = shots[i] ?? shots[shots.length - 1], next = shots[i + 1];
    const set = this.set(shot.set); set.tick?.(f);
    const m: Mood = MOODS[shot.mood];
    this.amb.color.set(m.amb[0]); this.amb.intensity = m.amb[1];
    this.sun.color.set(m.key[0]); this.sun.intensity = m.key[1];
    this.scene.background = skyTex(m, shot.mood); this.fog.color.set(m.fog[0]); this.fog.near = m.fog[1]; this.fog.far = m.fog[2];
    // camera
    const c = shot.cam(f), yaw = whip(f, shot.a, shot.b, shot.into === "whip", next?.into === "whip");
    cam.position.set(...c.pos); cam.fov = c.fov ?? 40; cam.aspect = aspect; cam.near = 0.1; cam.far = 400; cam.up.set(0, 1, 0);
    cam.lookAt(c.look[0], c.look[1], c.look[2]); cam.rotateY(-yaw); cam.rotateZ(c.roll ?? 0); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const kd = new THREE.Vector3(...m.key[2]).normalize().multiplyScalar(30);
    this.sun.target.position.set(c.look[0], 0, c.look[2]); this.sun.position.set(c.look[0] + kd.x, kd.y, c.look[2] + kd.z); this.sun.target.updateMatrixWorld();
    // cast
    for (const v of this.cards.values()) { v.mesh.visible = false; v.sh.visible = false; }
    const camYaw = Math.atan2(cam.position.x - c.look[0], cam.position.z - c.look[2]);
    for (const it of shot.cast?.(f) ?? []) {
      const cd = this.card(it.id, it.kind), mat = cd.mesh.material as THREE.MeshBasicMaterial;
      cd.mesh.visible = true; mat.color.set(m.cast); mat.blending = THREE.NormalBlending; mat.opacity = 1;
      let w = 1, h = 1, y0 = 0;
      if (it.kind === "person") {
        const key = JSON.stringify([it.look, it.pose]);
        if (key !== cd.key) { drawPerson(cd.canvas!.getContext("2d")!, it.look, it.pose); cd.tex!.needsUpdate = true; cd.key = key; }
        h = (it.h ?? 1.7) * (PH / 580); w = h * (PW / PH); y0 = -h * (20 / PH);
        cd.mesh.rotation.set(0, camYaw, 0);
      } else if (it.kind === "rat") {
        mat.map = this.rat(it.rat); h = 0.42 * (it.s ?? 1); w = h * (RW / RH); y0 = -h * (20 / RH);
        cd.mesh.rotation.set(0, camYaw, 0); cd.mesh.rotateZ(it.roll ?? 0);
      } else {
        mat.map = it.tex; w = it.w; h = it.h; mat.opacity = it.opacity ?? 1; mat.blending = it.add ? THREE.AdditiveBlending : THREE.NormalBlending; if (it.add) mat.color.set("#ffffff");
        if (it.flat) cd.mesh.rotation.set(-Math.PI / 2, 0, it.roll ?? 0); else { cd.mesh.rotation.set(0, camYaw, 0); cd.mesh.rotateZ(it.roll ?? 0); }
        y0 = it.flat ? 0 : -h / 2 + 0;
      }
      mat.needsUpdate = false;
      const flip = (it.kind !== "card" && it.flip) ? -1 : 1;
      cd.mesh.scale.set(w * flip, h, 1);
      cd.mesh.position.set(it.at[0], it.at[1] + (it.kind === "card" && it.flat ? 0 : h / 2 + y0), it.at[2]);
      if (it.kind !== "card" && it.shadow !== false) { cd.sh.visible = true; cd.sh.position.set(it.at[0], 0.02, it.at[2]); cd.sh.scale.set(w * 0.8, 1, w * 0.42); }
    }
    return m;
  }
}

const Inner: React.FC<{ film: Film }> = ({ film }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { camera, scene, gl } = useThree();
  gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFSoftShadowMap;
  const engine = useMemo(() => new Engine(film, scene), [film, scene]);
  engine.update(f, camera as THREE.PerspectiveCamera, width / height);
  return null;
};

const useFonts = () => {
  const [ok, setOk] = useState(false);
  const [h] = useState(() => delayRender("fonts"));
  useEffect(() => {
    const fonts = [new FontFace("Poppins", `url(${staticFile("fonts/Poppins-ExtraBold.ttf")})`, { weight: "800" }), new FontFace("Rye", `url(${staticFile("fonts/Rye-Regular.ttf")})`)];
    Promise.all(fonts.map((x) => x.load().then((l) => (document.fonts as unknown as { add: (f: FontFace) => void }).add(l)))).then(() => { setOk(true); continueRender(h); });
  }, [h]);
  return ok;
};

export const Stage: React.FC<{ film: Film }> = ({ film }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const ok = useFonts();
  if (!ok) return null;
  const i = Math.max(0, film.shots.findIndex((s) => f >= s.a && f < s.b)), shot = film.shots[i], next = film.shots[i + 1], m: Mood = MOODS[shot.mood];
  // transition overlays: 4-frame white flash or a 6-frame dip through black, split across the boundary
  let over = 0, col = "#fff";
  if (shot.into === "flash" && f < shot.a + 4) over = 1 - (f - shot.a) / 4;
  if (shot.into === "dip" && f < shot.a + 4) { over = 1 - (f - shot.a + 1) / 4; col = "#0a0612"; }
  if (next?.into === "dip" && f >= shot.b - 3) { over = (f - (shot.b - 3) + 1) / 3; col = "#0a0612"; }
  const whipping = (shot.into === "whip" && f < shot.a + 3) || (next?.into === "whip" && f >= shot.b - 3);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ filter: m.css + (whipping ? " blur(7px)" : "") }}>
        <ThreeCanvas width={width} height={height} flat shadows gl={{ antialias: true }} camera={{ fov: 40, near: 0.1, far: 400 }}>
          <Inner film={film} />
        </ThreeCanvas>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 85% 75% at 50% 46%, rgba(0,0,0,0) 55%, rgba(12,6,24,${m.vignette}) 100%)` }} />
      {over > 0 ? <AbsoluteFill style={{ background: col, opacity: over }} /> : null}
      {film.captions === false ? null : <Captions words={film.words} />}
    </AbsoluteFill>
  );
};
