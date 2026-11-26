// Shared helpers for the stage kit: seeded random, easing, colour maths and a cached Canvas2D texture factory.
import * as THREE from "three";

export type V3 = [number, number, number];
export type G = CanvasRenderingContext2D;

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
/** ease-out burst: fastest on the first frame, settling over the move (the reference camera move shape) */
export const burst = (x: number) => 1 - (1 - clamp01(x)) ** 4;
/** overshoot then settle: for pops, squash and stretch, things landing */
export const overshoot = (x: number, k = 1.9) => { const u = clamp01(x) - 1; return 1 + u * u * ((k + 1) * u + k); };
/** 0→1→0 bump over [0,1] */
export const bump = (x: number) => Math.sin(Math.PI * clamp01(x));
/** value over frames: progress of f inside [a, a+dur] */
export const prog = (f: number, a: number, dur: number) => clamp01((f - a) / dur);

/** deterministic random stream */
export const rng = (seed: number) => {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
};
export const hash = (a: number, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };

const hex = (c: string) => { const n = parseInt(c.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (r: number, g: number, b: number) => "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
export const shade = (c: string, k: number) => { const [r, g, b] = hex(c); return toHex(r * k, g * k, b * k); };
export const mix = (a: string, b: string, t: number) => { const A = hex(a), B = hex(b); return toHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)); };
export const INK = "#1d1420"; // warm near-black plum: every outline in the film

const texCache = new Map<string, THREE.CanvasTexture>();
/** Canvas2D painted texture, cached by key. `repeat` tiles it. */
export const ctex = (key: string, w: number, h: number, draw: (g: G, r: () => number) => void, repeat?: [number, number]) => {
  const k = key + (repeat ? `@${repeat[0]}x${repeat[1]}` : "");
  let t = texCache.get(k);
  if (t) return t;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d")!;
  draw(g, rng(key.split("").reduce((a, ch) => a + ch.charCodeAt(0), 7)));
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  texCache.set(k, t);
  return t;
};
