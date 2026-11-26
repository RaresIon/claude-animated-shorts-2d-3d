// Lighting moods. A short should move through at least three of them: the light changes with the story beat
// (day for setup, a dark or interior mood for the problem, a stylised one for the explanation, dusk for the payoff).
import { V3 } from "./util";

export type Mood = {
  sky: [string, string, string];      // top, middle, horizon
  amb: [string, number];              // ambient colour, intensity (pi = albedo unchanged)
  key: [string, number, V3];          // key light colour, intensity, direction it comes FROM
  fog: [string, number, number];      // colour (= horizon), near, far
  cast: string;                       // tint multiplied onto the 2D cast so they sit in the light
  css: string;                        // final grade (CSS filter on the canvas)
  vignette: number;                   // 0..1 corner darkening
  stars?: boolean;
};
export const MOODS = {
  day:      { sky: ["#3f8fe0", "#86c0f0", "#d8ecf7"], amb: ["#c8d4ff", 1.95], key: ["#fff1d6", 1.75, [4, 9, 6]], fog: ["#d8ecf7", 30, 160], cast: "#ffffff", css: "saturate(1.12) contrast(1.04)", vignette: 0.22 },
  golden:   { sky: ["#6f7fc8", "#f3a56a", "#ffd9a0"], amb: ["#b9a0d8", 1.6], key: ["#ffb061", 2.3, [-7, 3.2, 5]], fog: ["#ffd3a0", 22, 140], cast: "#ffe6cc", css: "saturate(1.15) contrast(1.05)", vignette: 0.3 },
  dusk:     { sky: ["#2a2a6a", "#8a4a8a", "#f08a5a"], amb: ["#8f86d8", 1.5], key: ["#ff9a6a", 1.4, [-6, 2.4, 4]], fog: ["#a8608a", 18, 110], cast: "#e4d2f2", css: "saturate(1.15) contrast(1.06)", vignette: 0.36 },
  night:    { sky: ["#0b1030", "#1b2a66", "#3a4a9a"], amb: ["#5f78e8", 1.35], key: ["#9fc0ff", 0.9, [-3, 8, 5]], fog: ["#26357a", 14, 90], cast: "#b9c6ff", css: "saturate(1.2) contrast(1.08)", vignette: 0.42, stars: true },
  sewer:    { sky: ["#0a1426", "#10233a", "#16324a"], amb: ["#7fb4e6", 2.3], key: ["#9fe6dc", 1.3, [2, 6, 6]], fog: ["#16324a", 9, 40], cast: "#e3ecf4", css: "saturate(1.18) contrast(1.08)", vignette: 0.5 },
  interior: { sky: ["#3a2a22", "#5a4030", "#7a5a40"], amb: ["#ffd9b0", 1.7], key: ["#ffe6b8", 1.5, [-5, 7, 6]], fog: ["#6a4a34", 20, 70], cast: "#fff0dc", css: "saturate(1.1) contrast(1.05)", vignette: 0.38 },
  fog:      { sky: ["#8fa3b4", "#b4c2cc", "#cfd8dd"], amb: ["#cfdbe6", 2.2], key: ["#e6eef2", 0.7, [3, 9, 5]], fog: ["#c6d0d6", 5, 46], cast: "#e2e8ec", css: "saturate(0.8) contrast(0.98)", vignette: 0.4 },
  arctic:   { sky: ["#3f7fd0", "#9fd0f0", "#e6f6fd"], amb: ["#cfe6ff", 2.0], key: ["#ffffff", 1.6, [-5, 8, 6]], fog: ["#dff2fb", 30, 150], cast: "#f2f8ff", css: "saturate(1.08) contrast(1.05)", vignette: 0.25 },
  explain:  { sky: ["#1a1446", "#3a2a86", "#6a4ab8"], amb: ["#9a8cff", 1.6], key: ["#ffd0f0", 1.2, [3, 8, 6]], fog: ["#4a3696", 16, 80], cast: "#e6dcff", css: "saturate(1.2) contrast(1.06)", vignette: 0.45, stars: true },
} satisfies Record<string, Mood>;
export type MoodName = keyof typeof MOODS;
