// The stage engine: plays a Film (sets + shots + cast + words) as a Remotion composition.
// One three.js scene, plain Lambert shading, inverted-hull ink and painted textures: no post-processing passes, so it
// renders on a CPU-only machine at full 1080x1920 (see docs/rendering.md). Captions and the grade are DOM layers.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { Cam, whip } from "./camera";
import { aim, personCard, shotCam } from "./frame";
import { MOODS, Mood, MoodName } from "./moods";
import { Look, PH, PW, Pose, RH, RW, Rat, drawPerson, drawRat } from "./chars";
import { V3, ctex } from "./util";
import { blob } from "./paint";
import { Captions, Word } from "./Captions";

export type CastItem =
  | { kind: "person"; id: string; look: Look; pose: Pose; at: V3; h?: number; flip?: boolean; shadow?: boolean; crop?: boolean }
  | { kind: "rat"; id: string; rat: Rat; at: V3; s?: number; flip?: boolean; roll?: number; shadow?: boolean; crop?: boolean }
  | { kind: "card"; id: string; tex: THREE.Texture; at: V3; w: number; h: number; roll?: number; add?: boolean; opacity?: number; flat?: boolean; crop?: boolean };
// `crop: true` tells plan_lint this item is MEANT to be cut by the frame edge (a foreground shoulder, a wind streak).
export type SetDef = { root: THREE.Object3D; tick?: (f: number) => void };
export type Shot = {
  a: number; b: number; set: string; mood: MoodName;
  cam: (f: number) => Cam;
  cast?: (f: number) => CastItem[];
  /** how this shot is entered. The reference never hard-cuts: use "dissolve" (8-frame cross-dissolve) for a new place
   *  or time, "move" (the camera travels from the previous framing in one burst; same set only), rarely "dip"/"flash". */
  into?: "dissolve" | "move" | "dip" | "flash" | "whip" | "cut";
  tag?: "insert" | "wide";           // for plan_lint: a deliberate prop insert or far wide
  /** plan_lint waivers for this shot: ids of cast items or the first line of a sign (e.g. "FOR SALE") that may be cut,
   *  hidden or too small here, or "lens" for a deliberate object right in front of the camera. Each one is printed. */
  allow?: string[];
};
/** Time warp: shots are authored on one timeline (`from` frames); when the voice is re-recorded, give the new frame
 *  of each anchor in `to` and the whole film follows without touching a shot. Piecewise linear. */
export type Warp = { from: number[]; to: number[] };
export type Film = { total: number; sets: Record<string, () => SetDef>; shots: Shot[]; words: Word[]; captions?: boolean; warp?: Warp };
export const DISSOLVE = 8;
/** the real output frame being drawn (shot functions receive the authoring frame; spoken-line mouth flaps need the real one) */
export const clock = { real: 0 };
/** real frame -> authoring frame */
export const unwarp = (w: Warp | undefined, f: number) => {
  if (!w) return f;
  const n = w.to.length; if (f <= w.to[0]) return w.from[0] + (f - w.to[0]); if (f >= w.to[n - 1]) return w.from[n - 1] + (f - w.to[n - 1]);
  let i = 0; while (i < n - 2 && f >= w.to[i + 1]) i++;
  return w.from[i] + ((f - w.to[i]) / (w.to[i + 1] - w.to[i])) * (w.from[i + 1] - w.from[i]);
};
/** authoring frame -> real frame */
export const warpTo = (w: Warp | undefined, f: number) => (w ? unwarp({ from: w.to, to: w.from }, f) : f);
/** which shots are on screen at authoring frame f, with opacity (two during a dissolve) */
export const layersAt = (film: Film, f: number): { i: number; alpha: number }[] => {
  const s = film.shots;
  for (let i = 1; i < s.length; i++) if (s[i].into === "dissolve" && f >= s[i].a - DISSOLVE / 2 && f < s[i].a + DISSOLVE / 2) return [{ i: i - 1, alpha: 1 }, { i, alpha: (f - (s[i].a - DISSOLVE / 2) + 0.5) / DISSOLVE }];
  const i = s.findIndex((x) => f >= x.a && f < x.b);
  return [{ i: i < 0 ? (f < s[0].a ? 0 : s.length - 1) : i, alpha: 1 }];
};

const skyTex = (m: Mood, key: string) => ctex(`sky${key}`, 16, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, m.sky[0]); gr.addColorStop(0.5, m.sky[1]); gr.addColorStop(0.78, m.sky[2]); gr.addColorStop(1, m.sky[2]);
  g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
  if (m.stars) { g.fillStyle = "#ffffff"; for (let i = 0; i < 26; i++) g.fillRect((i * 7.3) % 16, (i * 37.7) % 300, 1, 1); }
});

const RES = 2; // cast canvases are drawn at 2x so close-ups and inserts stay crisp
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
      if (kind === "person") { c.canvas = document.createElement("canvas"); c.canvas.width = PW * RES; c.canvas.height = PH * RES; c.tex = new THREE.CanvasTexture(c.canvas); c.tex.colorSpace = THREE.SRGBColorSpace; c.tex.anisotropy = 4; mat.map = c.tex; }
      this.castRoot.add(mesh, sh); this.cards.set(id, c);
    }
    return c;
  }
  private rat(r: Rat) {
    const q = { ...r, phase: Math.round((((r.phase ?? 0) % (Math.PI * 2)) + Math.PI * 2) / (Math.PI / 4)) % 8 * (Math.PI / 4) }, k = JSON.stringify(q);
    let t = this.ratTex.get(k);
    if (!t) { const c = document.createElement("canvas"); c.width = RW * RES; c.height = RH * RES; const g = c.getContext("2d")!; g.scale(RES, RES); drawRat(g, q); t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; this.ratTex.set(k, t); }
    return t;
  }
  update(f0: number, cam: THREE.PerspectiveCamera, aspect: number, i: number) {
    const shots = this.film.shots, shot = shots[i], next = shots[i + 1];
    const f = Math.max(shot.a, Math.min(shot.b - 0.001, f0)); // during a dissolve a shot is held at its own first / last frame
    const set = this.set(shot.set); set.tick?.(f);
    const m: Mood = MOODS[shot.mood];
    this.amb.color.set(m.amb[0]); this.amb.intensity = m.amb[1];
    this.sun.color.set(m.key[0]); this.sun.intensity = m.key[1];
    this.scene.background = skyTex(m, shot.mood); this.fog.color.set(m.fog[0]); this.fog.near = m.fog[1]; this.fog.far = m.fog[2];
    // camera
    // travel in from the previous framing on a "move"; the camera never fully stops (drift). Cards face the lens
    // (before the dutch roll) with their tilt capped at 35 degrees, so a card seen from a steep angle does not lean
    // back through the furniture behind it. All of it lives in frame.ts, where plan_lint uses the very same code.
    const c = shotCam(shots, i, f), { face, up } = aim(cam, c, aspect, whip(f, shot.a, shot.b, shot.into === "whip", next?.into === "whip"));
    const kd = new THREE.Vector3(...m.key[2]).normalize().multiplyScalar(30);
    this.sun.target.position.set(c.look[0], 0, c.look[2]); this.sun.position.set(c.look[0] + kd.x, kd.y, c.look[2] + kd.z); this.sun.target.updateMatrixWorld();
    // cast
    for (const v of this.cards.values()) { v.mesh.visible = false; v.sh.visible = false; }
    for (const it of shot.cast?.(f) ?? []) {
      const cd = this.card(it.id, it.kind), mat = cd.mesh.material as THREE.MeshBasicMaterial;
      cd.mesh.visible = true; mat.color.set(m.cast); mat.blending = THREE.NormalBlending; mat.opacity = 1;
      let w = 1, h = 1, y0 = 0;
      if (it.kind === "person") {
        const key = JSON.stringify([it.look, it.pose]);
        if (key !== cd.key) { const g = cd.canvas!.getContext("2d")!; g.setTransform(RES, 0, 0, RES, 0, 0); drawPerson(g, it.look, it.pose); cd.tex!.needsUpdate = true; cd.key = key; }
        ({ w, h, y0 } = personCard(it.h));
        cd.mesh.quaternion.copy(face);
      } else if (it.kind === "rat") {
        mat.map = this.rat(it.rat); h = 0.42 * (it.s ?? 1); w = h * (RW / RH); y0 = -h * (20 / RH);
        cd.mesh.quaternion.copy(face); cd.mesh.rotateZ(it.roll ?? 0);
      } else {
        mat.map = it.tex; w = it.w; h = it.h; mat.opacity = it.opacity ?? 1; mat.blending = it.add ? THREE.AdditiveBlending : THREE.NormalBlending; if (it.add) mat.color.set("#ffffff");
        if (it.flat) cd.mesh.rotation.set(-Math.PI / 2, 0, it.roll ?? 0); else { cd.mesh.quaternion.copy(face); cd.mesh.rotateZ(it.roll ?? 0); }
        y0 = it.flat ? 0 : -h / 2 + 0;
      }
      mat.needsUpdate = false;
      const flip = (it.kind !== "card" && it.flip) ? -1 : 1;
      cd.mesh.scale.set(w * flip, h, 1);
      const lift = it.kind === "card" && it.flat ? 0 : h / 2 + y0; // the card's foot stays on its spot whatever the camera pitch
      cd.mesh.position.set(it.at[0] + up.x * lift, it.at[1] + up.y * lift, it.at[2] + up.z * lift);
      if (it.kind !== "card" && it.shadow !== false) { cd.sh.visible = true; cd.sh.position.set(it.at[0], 0.02, it.at[2]); cd.sh.scale.set(w * 0.8, 1, w * 0.42); }
    }
    return m;
  }
}

const Inner: React.FC<{ film: Film; shot: number }> = ({ film, shot }) => {
  const real = useCurrentFrame(), f = unwarp(film.warp, real);
  clock.real = real;
  const { width, height } = useVideoConfig();
  const { camera, scene, gl } = useThree();
  gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFSoftShadowMap;
  const engine = useMemo(() => new Engine(film, scene), [film, scene]);
  engine.update(f, camera as THREE.PerspectiveCamera, width / height, shot);
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
  const f = unwarp(film.warp, useCurrentFrame());
  const { width, height } = useVideoConfig();
  const ok = useFonts();
  if (!ok) return null;
  const layers = layersAt(film, f), i = layers[layers.length - 1].alpha >= 0.5 ? layers[layers.length - 1].i : layers[0].i, shot = film.shots[i], next = film.shots[i + 1], m: Mood = MOODS[shot.mood];
  // transition overlays: 4-frame white flash or a 6-frame dip through black, split across the boundary
  let over = 0, col = "#fff";
  if (shot.into === "flash" && f < shot.a + 4) over = 1 - (f - shot.a) / 4;
  if (shot.into === "dip" && f < shot.a + 4) { over = 1 - (f - shot.a + 1) / 4; col = "#0a0612"; }
  if (next?.into === "dip" && f >= shot.b - 3) { over = (f - (shot.b - 3) + 1) / 3; col = "#0a0612"; }
  const whipping = (shot.into === "whip" && f < shot.a + 3) || (next?.into === "whip" && f >= shot.b - 3);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {layers.map((l, k) => (
        <AbsoluteFill key={k} style={{ filter: MOODS[film.shots[l.i].mood].css + (whipping ? " blur(7px)" : ""), opacity: l.alpha }}>
          <ThreeCanvas width={width} height={height} flat shadows gl={{ antialias: true }} camera={{ fov: 40, near: 0.1, far: 400 }}>
            <Inner film={film} shot={l.i} />
          </ThreeCanvas>
        </AbsoluteFill>
      ))}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 85% 75% at 50% 46%, rgba(0,0,0,0) 55%, rgba(12,6,24,${m.vignette}) 100%)` }} />
      {over > 0 ? <AbsoluteFill style={{ background: col, opacity: over }} /> : null}
      {film.captions === false ? null : <Captions words={film.words} />}
    </AbsoluteFill>
  );
};
