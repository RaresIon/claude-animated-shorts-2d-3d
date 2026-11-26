// Word-by-word captions, measured on three full reference videos: 1-2 words at a time (3 at most), bold white
// sans with a black outline and drop shadow, capital height about 5 % of the frame width, centred at 70 % of the
// height, hard swap on the word with no pop and no fade, never over a face.
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

export type Word = { w: string; s: number; e: number };
export type Chunk = { t: string; s: number; e: number };

/** group words into caption chunks: break on punctuation, at 3 words, or past ~13 characters */
export const chunk = (words: Word[], maxWords = 2, maxChars = 12): Chunk[] => {
  const out: Chunk[] = []; let cur: Word[] = [];
  const flush = () => { if (cur.length) { out.push({ t: cur.map((w) => w.w).join(" "), s: cur[0].s, e: cur[cur.length - 1].e }); cur = []; } };
  for (const w of words) {
    const len = cur.map((x) => x.w).join(" ").length;
    if (cur.length && (cur.length >= maxWords || len + 1 + w.w.length > maxChars)) flush();
    cur.push(w);
    if (/[.,!?;:]$/.test(w.w)) flush();
  }
  flush();
  // each chunk stays up until the next one starts (no flicker in short gaps), at most 0.6 s past its last word
  return out.map((c, i) => ({ ...c, e: i + 1 < out.length ? Math.min(out[i + 1].s, c.e + 0.6) : c.e + 0.4 }));
};

export const Captions: React.FC<{ words: Word[]; y?: number }> = ({ words, y = 0.7 }) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const chunks = React.useMemo(() => chunk(words), [words]);
  const t = (f + 0.5) / fps, c = chunks.find((k) => t >= k.s && t < k.e);
  if (!c) return null;
  const pop = 1, size = width * 0.066, st = size * 0.2; // hard swap, no pop: measured on the reference
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: height * y, left: 0, right: 0, textAlign: "center", fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: size, lineHeight: 1,
        color: "#fff", transform: `translateY(-50%) scale(${pop})`, WebkitTextStroke: `${st}px #0b0710`, paintOrder: "stroke fill", textShadow: `0 ${size * 0.07}px 0 #0b0710`, letterSpacing: "-0.01em" }}>
        {c.t}
      </div>
    </AbsoluteFill>
  );
};
