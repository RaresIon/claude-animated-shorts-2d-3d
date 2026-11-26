// Camera grammar measured on the reference: the camera HOLDS about 80 % of the time with a slow push-in, and moves
// in ease-out bursts (fastest on the first frame, settled in 8-12 frames). Place changes are whips or fly-throughs,
// almost never plain hard cuts.
import { V3, burst, clamp01, lerp } from "./util";

export type Cam = { pos: V3; look: V3; fov?: number; roll?: number };
const mixV = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const mixCam = (a: Cam, b: Cam, t: number): Cam => ({ pos: mixV(a.pos, b.pos, t), look: mixV(a.look, b.look, t), fov: lerp(a.fov ?? 40, b.fov ?? 40, t), roll: lerp(a.roll ?? 0, b.roll ?? 0, t) });

/** slow push toward the look point: `rate` per frame (0.0015-0.0035 reads as alive, not as a move) */
export const push = (c: Cam, frames: number, rate = 0.0022): Cam => { const k = Math.exp(-rate * Math.max(0, frames)); return { ...c, pos: mixV(c.look, c.pos, k) }; };

/** A shot's camera: a list of framings with the frame each one is reached BY BURST. Between bursts it holds and creeps.
 *  cam = track(f, [{ f: 0, cam: A }, { f: 48, cam: B, dur: 10 }]) */
export const track = (f: number, keys: { f: number; cam: Cam; dur?: number; rate?: number }[]): Cam => {
  let cur = push(keys[0].cam, f - keys[0].f, keys[0].rate);
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = mixCam(cur, push(k.cam, f - k.f, k.rate), burst((f - k.f) / (k.dur ?? 10)));
  }
  return cur;
};
/** every camera breathes: a slow sway of about half a percent of its distance, so no hold is ever a frozen frame */
export const drift = (c: Cam, f: number): Cam => {
  const d = Math.hypot(c.pos[0] - c.look[0], c.pos[1] - c.look[1], c.pos[2] - c.look[2]);
  return { ...c, pos: [c.pos[0] + Math.sin(f * 0.031) * 0.006 * d, c.pos[1] + Math.sin(f * 0.023 + 1.3) * 0.004 * d, c.pos[2]], roll: (c.roll ?? 0) + Math.sin(f * 0.019 + 0.7) * 0.004 };
};
/** impact shake: flips sign every frame and dies in `n` frames */
export const shake = (c: Cam, f: number, at: number, amp = 0.12, n = 8): Cam => {
  const d = f - at; if (d < 0 || d >= n) return c;
  const a = amp * (1 - d / n) * (d % 2 ? -1 : 1);
  return { ...c, pos: [c.pos[0] + a * 0.6, c.pos[1] + a, c.pos[2]], look: [c.look[0] - a * 0.4, c.look[1] + a * 0.5, c.look[2]] };
};
/** whip transition: the outgoing shot swings off over its last `n` frames, the incoming one swings in. Returns a yaw
 *  offset in radians for frame f of a shot [a, b). */
export const whip = (f: number, a: number, b: number, into: boolean, out: boolean, n = 5, amt = 0.9) => {
  let y = 0;
  if (into && f < a + n) y -= amt * (1 - burst((f - a + 1) / n));
  if (out && f >= b - n) y += amt * clamp01((f - (b - n) + 1) / n) ** 2;
  return y;
};
