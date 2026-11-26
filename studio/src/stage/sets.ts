// Base sets: the shell of a place. Dress them with props.ts until the density check passes (scripts/frame_qa.py).
// Convention: the usual camera stands at +z and looks toward -z; the back wall / far side is at negative z.
import * as THREE from "three";
import { box, card, cloud, cyl, group, hill, inked, lit, put } from "./props";
import { cobbles, dirt, grass, planks, plaster, stoneBlocks, tiles } from "./paint";
import { ctex, shade } from "./util";

const ground = (w: number, d: number, tex: THREE.Texture) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), lit(tex)); m.receiveShadow = true; return m; };

/** interior: floor, three walls with baseboard and picture rail, ceiling beams. Origin at the floor centre. */
export const room = (o: { w?: number; d?: number; h?: number; wall?: string; floor?: THREE.Texture; dado?: string } = {}) => {
  const w = o.w ?? 8, d = o.d ?? 7, h = o.h ?? 4, wall = o.wall ?? "#d8c59a", dado = o.dado ?? "#7a4a28";
  const g = group(ground(w, d, o.floor ?? planks("#b0763f", 6, false, [w / 2, d / 2])));
  const wt = plaster(wall, [w / 3, h / 3]);
  const walls: [number, number, number, number][] = [[0, -d / 2, w, 0], [-w / 2, 0, d, Math.PI / 2], [w / 2, 0, d, -Math.PI / 2]];
  for (const [x, z, len, ry] of walls) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(len, h).translate(0, h / 2, 0), lit(wt)); p.receiveShadow = true; put(p, x, 0, z, ry); g.add(p);
    g.add(put(box(len, 1.0, 0.06, planks(dado, 8, true, [len / 1.2, 1])), x, 0, z, ry), put(box(len, 0.1, 0.1, shade(dado, 1.2)), x, 1.0, z, ry), put(box(len, 0.16, 0.1, shade(dado, 0.8)), x, 0, z, ry), put(box(len, 0.1, 0.08, shade(dado, 1.1)), x, h - 0.6, z, ry));
  }
  for (let i = -1; i <= 1; i++) g.add(put(box(0.22, 0.22, d, shade(dado, 0.85), false), i * (w / 3), h - 0.22, 0));
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(Math.PI / 2), lit(shade(wall, 0.8))); ceil.position.y = h; g.add(ceil);
  return g;
};

/** street: cobbled road along x, raised pavement at the back (z<0) for the house fronts to stand on */
export const street = (o: { len?: number; road?: string; far?: boolean } = {}) => {
  const len = o.len ?? 40, g = group(put(ground(len, 30, cobbles(o.road ?? "#8d8a94", [len / 3, 10])), 0, 0, 6));
  g.add(put(box(len, 0.16, 3.2, tiles("#cfc6b4", "#bdb39f", [len / 2, 2.5])), 0, 0, -3.3));
  return g;
};

/** sewer tunnel along x: brick arch, two walkways, a channel of green water down the middle */
export const tunnel = (o: { len?: number; r?: number; stone?: string } = {}) => {
  const len = o.len ?? 30, r = o.r ?? 3.2, stone = o.stone ?? "#5d6b7a";
  const arch = new THREE.CylinderGeometry(r, r, len, 20, 1, true, 0, Math.PI).rotateZ(Math.PI / 2);
  const am = lit(stoneBlocks(stone, [len / 4, 3])); am.side = THREE.BackSide;
  const g = group(new THREE.Mesh(arch, am));
  const water = ctex("sewerwater", 256, 256, (c, q) => { c.fillStyle = "#2f6a5a"; c.fillRect(0, 0, 256, 256); c.strokeStyle = "#7fd0a8"; c.lineWidth = 4; c.lineCap = "round"; for (let i = 0; i < 26; i++) { const x = q() * 256, y = q() * 256; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 14, y - 5, x + 30, y); c.stroke(); } }, [len / 3, 1]);
  g.add(put(new THREE.Mesh(new THREE.PlaneGeometry(len, r * 0.8).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: water })), 0, -0.25, 0));
  for (const s of [-1, 1]) g.add(put(box(len, 0.5, r * 0.62, stoneBlocks(shade(stone, 1.15), [len / 3, 0.5])), 0, -0.5, s * r * 0.71));
  for (let x = -len / 2; x <= len / 2; x += 5) { const rib = new THREE.TorusGeometry(r - 0.06, 0.16, 6, 20, Math.PI).rotateY(Math.PI / 2); g.add(put(inked(rib, lit(shade(stone, 0.7))), x, 0, 0)); }
  return { g, r, len, water };
};

/** open country: big ground, rolling hills on the horizon, clouds */
export const field = (o: { ground?: THREE.Texture; hills?: string; size?: number } = {}) => {
  const s = o.size ?? 160, g = group(ground(s, s, o.ground ?? grass("#86b84f", [s / 4, s / 4])));
  for (let i = 0; i < 7; i++) g.add(put(hill(22 + (i % 3) * 9, shade(o.hills ?? "#7fae58", 0.9 + (i % 4) * 0.06), 0.22 + (i % 2) * 0.1), -70 + i * 24, -0.5, -55 - (i % 3) * 12));
  for (let i = 0; i < 6; i++) g.add(put(cloud(9 + (i % 3) * 3, i + 3), -60 + i * 26, 20 + (i % 3) * 5, -90));
  return g;
};
export { card, cyl, dirt };

/** open water: a big sea plane with painted wave marks (scroll `water.offset` in the set's tick), an optional shore
 *  strip at the back (z < -shoreZ) and far islands. Stand a ship at the origin and bob it in the tick. */
export const sea = (o: { water?: string; shore?: THREE.Texture; shoreZ?: number; foam?: string } = {}) => {
  const c0 = o.water ?? "#2f7fb8";
  const water = ctex(`sea${c0}`, 512, 512, (g, r) => {
    g.fillStyle = c0; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 40; i++) { g.fillStyle = shade(c0, 0.85 + r() * 0.3) + "88"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 40 + r() * 70, 10 + r() * 16, 0, 0, 7); g.fill(); }
    g.lineCap = "round"; g.lineWidth = 5;
    for (let i = 0; i < 46; i++) { const x = r() * 512, y = r() * 512, w = 26 + r() * 50; g.strokeStyle = i % 3 ? shade(c0, 1.45) : (o.foam ?? "#eaf7fd"); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 9, x + w, y); g.stroke(); }
  }, [26, 26]);
  const g = group(); const plane = new THREE.Mesh(new THREE.PlaneGeometry(260, 260).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: water })); plane.receiveShadow = true; g.add(plane);
  if (o.shore) { const z = o.shoreZ ?? 9; const land = new THREE.Mesh(new THREE.PlaneGeometry(260, 120).rotateX(-Math.PI / 2), lit(o.shore)); land.receiveShadow = true; land.position.set(0, 0.06, -z - 60); g.add(land); g.add(put(box(260, 0.1, 1.2, "#eaf7fd", false), 0, 0.0, -z + 0.5)); }
  for (let i = 0; i < 6; i++) g.add(put(cloud(9 + (i % 3) * 3, i + 3), -60 + i * 26, 22 + (i % 3) * 5, -110));
  return { g, water };
};
