// Painted surfaces. Every texture carries its own drawn detail (seams, grain, chips, stains) so a flat wall is
// never a flat colour. Texture lines are thinner and lighter than the ink outline.
import { G, INK, ctex, mix, shade } from "./util";

const seam = (c: string) => shade(c, 0.55);

export const planks = (base = "#c98a4b", n = 6, vertical = false, rep?: [number, number]) =>
  ctex(`planks${base}${n}${vertical}`, 512, 512, (g, r) => {
    const w = 512 / n;
    for (let i = 0; i < n; i++) {
      const c = shade(base, 0.9 + r() * 0.2);
      g.fillStyle = c;
      if (vertical) g.fillRect(i * w, 0, w, 512); else g.fillRect(0, i * w, 512, w);
      g.strokeStyle = shade(c, 0.86); g.lineWidth = 2;
      for (let k = 0; k < 5; k++) { // grain
        const o = i * w + 6 + r() * (w - 12), a = r() * 380, l = 60 + r() * 120;
        g.beginPath();
        if (vertical) { g.moveTo(o, a); g.quadraticCurveTo(o + 4, a + l / 2, o, a + l); } else { g.moveTo(a, o); g.quadraticCurveTo(a + l / 2, o + 4, a + l, o); }
        g.stroke();
      }
      g.fillStyle = seam(base); // board ends + nails
      const e = r() * 512;
      if (vertical) { g.fillRect(i * w, e, w, 3); } else { g.fillRect(e, i * w, 3, w); }
      g.fillStyle = shade(base, 0.5);
      for (const d of [-9, 9]) { g.beginPath(); if (vertical) g.arc(i * w + w / 2, (e + d + 512) % 512, 2.6, 0, 7); else g.arc((e + d + 512) % 512, i * w + w / 2, 2.6, 0, 7); g.fill(); }
    }
    g.strokeStyle = seam(base); g.lineWidth = 4;
    for (let i = 0; i <= n; i++) { g.beginPath(); if (vertical) { g.moveTo(i * w, 0); g.lineTo(i * w, 512); } else { g.moveTo(0, i * w); g.lineTo(512, i * w); } g.stroke(); }
  }, rep);

export const plaster = (base = "#e9d9b0", rep?: [number, number]) =>
  ctex(`plaster${base}`, 512, 512, (g, r) => {
    g.fillStyle = base; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 70; i++) { // soft mottling
      g.fillStyle = (i % 2 ? shade(base, 0.95) : shade(base, 1.05)) + "66";
      g.beginPath(); g.ellipse(r() * 512, r() * 512, 20 + r() * 60, 10 + r() * 30, r() * 3, 0, 7); g.fill();
    }
    g.strokeStyle = shade(base, 0.72); g.lineWidth = 2.5; // cracks and chips
    for (let i = 0; i < 5; i++) {
      let x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += -18 + r() * 36; y += 10 + r() * 22; g.lineTo(x, y); }
      g.stroke();
    }
    for (let i = 0; i < 4; i++) { // exposed brick patches
      const x = r() * 460, y = r() * 460; g.fillStyle = "#c2714f";
      g.fillRect(x, y, 34, 14); g.fillRect(x + 12, y + 17, 34, 14);
      g.strokeStyle = shade(base, 0.7); g.strokeRect(x, y, 34, 14); g.strokeRect(x + 12, y + 17, 34, 14);
    }
  }, rep);

export const bricks = (base = "#a85a44", rep?: [number, number]) =>
  ctex(`bricks${base}`, 512, 512, (g, r) => {
    g.fillStyle = shade(base, 0.6); g.fillRect(0, 0, 512, 512);
    const bw = 64, bh = 32;
    for (let y = 0; y < 16; y++) for (let x = -1; x < 9; x++) {
      g.fillStyle = shade(base, 0.82 + r() * 0.36);
      const ox = x * bw + (y % 2) * (bw / 2);
      g.fillRect(ox + 2, y * bh + 2, bw - 4, bh - 4);
      if (r() < 0.25) { g.fillStyle = shade(base, 1.25) + "88"; g.fillRect(ox + 6, y * bh + 5, bw - 26, 4); }
    }
  }, rep);

export const cobbles = (base = "#8d8a94", rep?: [number, number]) =>
  ctex(`cobbles${base}`, 512, 512, (g, r) => {
    g.fillStyle = shade(base, 0.55); g.fillRect(0, 0, 512, 512);
    const n = 8, s = 512 / n;
    for (let y = 0; y < n; y++) for (let x = -1; x < n + 1; x++) {
      const ox = x * s + (y % 2) * (s / 2), c = shade(mix(base, r() < 0.3 ? "#a98f78" : base, 0.5), 0.85 + r() * 0.3);
      g.fillStyle = c; g.beginPath(); g.roundRect(ox + 4, y * s + 4, s - 8, s - 8, 14); g.fill();
      g.fillStyle = shade(c, 1.18); g.beginPath(); g.roundRect(ox + 9, y * s + 8, s - 30, 8, 4); g.fill();
    }
  }, rep);

export const tiles = (a = "#e8e2d2", b = "#b9483c", rep?: [number, number]) =>
  ctex(`tiles${a}${b}`, 512, 512, (g, r) => {
    const n = 4, s = 512 / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      g.fillStyle = shade((x + y) % 2 ? a : b, 0.94 + r() * 0.1); g.fillRect(x * s, y * s, s, s);
      g.strokeStyle = shade((x + y) % 2 ? a : b, 0.7); g.lineWidth = 3; g.strokeRect(x * s, y * s, s, s);
      if (r() < 0.3) { g.strokeStyle = shade(a, 0.6); g.lineWidth = 2; g.beginPath(); g.moveTo(x * s + r() * s, y * s); g.lineTo(x * s + r() * s, y * s + s * 0.5); g.stroke(); }
    }
  }, rep);

export const dirt = (base = "#b8824e", rep?: [number, number]) =>
  ctex(`dirt${base}`, 512, 512, (g, r) => {
    g.fillStyle = base; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 160; i++) {
      g.fillStyle = shade(base, 0.82 + r() * 0.36) + "aa";
      g.beginPath(); g.ellipse(r() * 512, r() * 512, 8 + r() * 30, 4 + r() * 12, r() * 3, 0, 7); g.fill();
    }
    for (let i = 0; i < 50; i++) { g.fillStyle = shade(base, 0.6); g.beginPath(); g.arc(r() * 512, r() * 512, 2 + r() * 3, 0, 7); g.fill(); }
  }, rep);

export const grass = (base = "#7fb24a", rep?: [number, number]) =>
  ctex(`grass${base}`, 512, 512, (g, r) => {
    g.fillStyle = base; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 90; i++) { g.fillStyle = shade(base, 0.85 + r() * 0.3) + "99"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 20 + r() * 40, 10 + r() * 16, r() * 3, 0, 7); g.fill(); }
    g.lineWidth = 3; g.lineCap = "round";
    for (let i = 0; i < 260; i++) {
      const x = r() * 512, y = r() * 512; g.strokeStyle = shade(base, r() < 0.5 ? 0.7 : 1.25);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - 4 + r() * 8, y - 8 - r() * 10); g.stroke();
    }
    for (let i = 0; i < 14; i++) { g.fillStyle = ["#f4e04d", "#f5f1e6", "#e96a6a"][i % 3]; g.beginPath(); g.arc(r() * 512, r() * 512, 4, 0, 7); g.fill(); }
  }, rep);

export const stoneBlocks = (base = "#5d6b7a", rep?: [number, number]) =>
  ctex(`stone${base}`, 512, 512, (g, r) => {
    g.fillStyle = shade(base, 0.5); g.fillRect(0, 0, 512, 512);
    const bh = 64;
    for (let y = 0; y < 8; y++) { let x = -(y % 2) * 50; while (x < 512) { const w = 80 + r() * 70; const c = shade(base, 0.8 + r() * 0.4);
      g.fillStyle = c; g.fillRect(x + 3, y * bh + 3, w - 6, bh - 6);
      g.fillStyle = shade(c, 1.2); g.fillRect(x + 7, y * bh + 6, w - 30, 5);
      if (r() < 0.35) { g.fillStyle = "#4f7a4a99"; g.beginPath(); g.ellipse(x + w / 2, y * bh + bh - 6, w / 3, 9, 0, 0, 7); g.fill(); } // moss
      if (r() < 0.25) { g.strokeStyle = "#1d2a3a88"; g.lineWidth = 4; g.beginPath(); g.moveTo(x + w / 2, y * bh + 10); g.lineTo(x + w / 2 + 3, y * bh + bh + 30); g.stroke(); } // drip
      x += w; } }
  }, rep);

/** a painted sign / poster / label with real lettering. `font` is a CSS font family loaded by Fonts.tsx. */
export const sign = (key: string, w: number, h: number, bg: string, lines: { t: string; size: number; col?: string; font?: string; y: number }[], border = INK, extra?: (g: G) => void) =>
  ctex(`sign${key}`, w, h, (g, r) => {
    if (bg.length === 7) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    if (bg.length === 7) for (let i = 0; i < 12; i++) { g.fillStyle = shade(bg, 0.9 + r() * 0.15) + "77"; g.beginPath(); g.ellipse(r() * w, r() * h, 30 + r() * 50, 12 + r() * 20, r() * 3, 0, 7); g.fill(); }
    extra?.(g);
    g.textAlign = "center"; g.textBaseline = "middle";
    for (const l of lines) { g.font = `${l.size}px ${l.font ?? "Rye"}, serif`; g.fillStyle = l.col ?? INK; g.fillText(l.t, w / 2, l.y, w * 0.92); }
    if (border.length === 7) { g.strokeStyle = border; g.lineWidth = Math.max(8, w * 0.03); g.strokeRect(0, 0, w, h); }
  });

export const flat = (c: string) => ctex(`flat${c}`, 8, 8, (g) => { g.fillStyle = c; g.fillRect(0, 0, 8, 8); });

/** round soft blob (contact shadows, light pools, glows) */
export const blob = (c = "#000000") => ctex(`blob${c}`, 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, c + "ff"); gr.addColorStop(0.55, c + "88"); gr.addColorStop(1, c + "00");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
