/**
 * AURELIA Pro X1 — procedural espresso machine (PBR studio).
 *
 * Ported from the standalone Three.js r128 "PBR Studio" sketch to a typed
 * builder for three 0.184 inside R3F. Every surface now ships a full PBR
 * triple — base colour + height-derived normal map + height-derived
 * roughness map — so the brushed metal / copper / walnut read with real
 * micro-relief instead of looking flat ("texture quasi scomparsa" fix).
 *
 * Bodies use RoundedBoxGeometry (clean box UVs) rather than the original
 * ExtrudeGeometry, whose degenerate UVs were what killed the texture in
 * the earlier draft.
 *
 * `buildEspressoMachine()` returns a THREE.Group: base on Y=0, centred on
 * X/Z, ~3.75 units tall. Reflections come from the scene environment
 * (R3F <Environment>), so no PMREM/env-map generation here. Feature
 * anchors for the hotspot system are exported via `MACHINE_ANCHORS`.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three-stdlib";
import { type SmegColorId, getSmegColor } from "./smegVariants";

// ── Dimensions ───────────────────────────────────────────────────────────
const W = 2.05;
const D = 2.85;
const HB = 0.5;
const HL = 1.85;
const HU = 1.4;
const SB = 0.55;

const UY = HB + HL + HU / 2; // 3.05  (upper housing mid)
const FZ = D / 2; // 1.425  (front plane)
const GH_Y = HB + HL - 0.05; // 2.30 (group head Y)
const GH_Z = D / 2 - SB + 0.001; // 0.876 (group head Z)
const TOP_Y = HB + HL + HU; // 3.75
const GRATE_Z = D / 2 - SB / 2; // 1.15
const GRATE_Y = HB + 0.012; // 0.512

export const MACHINE_ANCHORS = {
  display: new THREE.Vector3(-0.4, UY + 0.18, FZ + 0.04),
  gauge: new THREE.Vector3(0.6, UY + 0.18, FZ + 0.06),
  buttons: new THREE.Vector3(-0.4, UY - 0.2, FZ + 0.015),
  group: new THREE.Vector3(0, GH_Y, GH_Z + 0.25),
  portafilter: new THREE.Vector3(-0.45, GH_Y - 0.17, GH_Z + 0.12),
  steam: new THREE.Vector3(0.62, GH_Y - 0.2, GH_Z + 0.1),
  warmer: new THREE.Vector3(-W * 0.1, TOP_Y + 0.02, 0),
  tray: new THREE.Vector3(0, GRATE_Y, GRATE_Z),
} as const;

export const MACHINE_BBOX = { width: W, depth: D, height: TOP_Y } as const;

// ── Height → normal / roughness ──────────────────────────────────────────
function heightToNormal(hc: HTMLCanvasElement, strength = 3.0): HTMLCanvasElement {
  const w = hc.width;
  const h = hc.height;
  const src = hc
    .getContext("2d", { willReadFrequently: true })!
    .getImageData(0, 0, w, h);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const oc = out.getContext("2d")!;
  const oi = oc.createImageData(w, h);
  const getH = (x: number, y: number) => {
    x = ((x % w) + w) % w;
    y = ((y % h) + h) % h;
    return src.data[(y * w + x) * 4] / 255;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (getH(x + 1, y) - getH(x - 1, y)) * strength;
      const dy = (getH(x, y + 1) - getH(x, y - 1)) * strength;
      const nz = 1.0;
      const len = Math.sqrt(dx * dx + dy * dy + nz * nz);
      const i = (y * w + x) * 4;
      oi.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      oi.data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      oi.data[i + 2] = (nz / len) * 255;
      oi.data[i + 3] = 255;
    }
  }
  oc.putImageData(oi, 0, 0);
  return out;
}

function heightToRoughness(
  hc: HTMLCanvasElement,
  minR = 0.25,
  maxR = 0.55,
): HTMLCanvasElement {
  const w = hc.width;
  const h = hc.height;
  const src = hc
    .getContext("2d", { willReadFrequently: true })!
    .getImageData(0, 0, w, h);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const oc = out.getContext("2d")!;
  const oi = oc.createImageData(w, h);
  for (let i = 0; i < src.data.length; i += 4) {
    const v = src.data[i] / 255;
    const dev = Math.abs(v - 0.5) * 2;
    const r = minR + (maxR - minR) * dev;
    const c = Math.floor(r * 255);
    oi.data[i] = oi.data[i + 1] = oi.data[i + 2] = c;
    oi.data[i + 3] = 255;
  }
  oc.putImageData(oi, 0, 0);
  return out;
}

function makeTex(
  canvas: HTMLCanvasElement,
  sRGB = false,
  repeat = 1,
): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 16;
  t.colorSpace = sRGB ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.repeat.set(repeat, repeat);
  return t;
}

type PbrSet = {
  color: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
};

// ── PBR texture sets ─────────────────────────────────────────────────────
function texSetSatinMetal(baseHex: string, size = 512): PbrSet {
  const colorC = document.createElement("canvas");
  colorC.width = colorC.height = size;
  const cc = colorC.getContext("2d")!;
  cc.fillStyle = baseHex;
  cc.fillRect(0, 0, size, size);
  for (let i = 0; i < 250; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 20 + Math.random() * 80;
    const g = cc.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, Math.random() < 0.6 ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.025)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    cc.fillStyle = g;
    cc.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const heightC = document.createElement("canvas");
  heightC.width = heightC.height = size;
  // willReadFrequently: these height canvases are read back via
  // getImageData in heightToNormal/heightToRoughness. The hint moves the
  // backing store to CPU memory so the Sobel readback doesn't stall on a
  // GPU→CPU texture copy (the logged Canvas2D readback warning).
  const hc = heightC.getContext("2d", { willReadFrequently: true })!;
  hc.fillStyle = "#808080";
  hc.fillRect(0, 0, size, size);
  // Fine DIRECTIONAL brushed grain (anisotropic), not random scribble.
  // The previous 9000 random-angle short strokes built a pebbled normal
  // map that read as black leather. Long, near-horizontal, low-contrast
  // streaks read as brushed anthracite metal — matching the Cycles hero.
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = size * (0.25 + Math.random() * 0.6);
    const angle = (Math.random() - 0.5) * 0.05; // ≈ ±1.4° off horizontal
    const lvl = 18 + Math.random() * 42;
    hc.strokeStyle =
      Math.random() < 0.5 ? `rgba(255,255,255,${lvl / 255})` : `rgba(0,0,0,${lvl / 255})`;
    hc.lineWidth = 0.4 + Math.random() * 0.7;
    hc.beginPath();
    hc.moveTo(x, y);
    hc.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    hc.stroke();
  }
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 30 + Math.random() * 70;
    const lvl = Math.random() < 0.5 ? 90 : 175;
    const g = hc.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${lvl},${lvl},${lvl},0.12)`);
    g.addColorStop(1, `rgba(${lvl},${lvl},${lvl},0)`);
    hc.fillStyle = g;
    hc.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return {
    color: makeTex(colorC, true, 2),
    // strength 4.0→1.4: brushed metal is a shallow satin grain, not a
    // deep bumpy relief. High strength was a big part of the leather look.
    normal: makeTex(heightToNormal(heightC, 1.4), false, 2),
    roughness: makeTex(heightToRoughness(heightC, 0.34, 0.52), false, 2),
  };
}

function texSetCopper(size = 512): PbrSet {
  const colorC = document.createElement("canvas");
  colorC.width = colorC.height = size;
  const cc = colorC.getContext("2d")!;
  const grad = cc.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, size / 1.2);
  // Tuned to the Cycles metal-fixed bake (basecolor_gauge_rim, 2026-05-16):
  // sampled mean sRGB rgb(212,164,104), bright rgb(218,170,108) — burnished
  // "rame brunito", less orange/dark than the prior #b87344 mid.
  grad.addColorStop(0, "#dba572");
  grad.addColorStop(0.5, "#c98a56");
  grad.addColorStop(1, "#7a4e2c");
  cc.fillStyle = grad;
  cc.fillRect(0, 0, size, size);
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 20 + Math.random() * 90;
    const g = cc.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, Math.random() < 0.5 ? "rgba(220,140,80,0.18)" : "rgba(40,20,10,0.18)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    cc.fillStyle = g;
    cc.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const heightC = document.createElement("canvas");
  heightC.width = heightC.height = size;
  // willReadFrequently: these height canvases are read back via
  // getImageData in heightToNormal/heightToRoughness. The hint moves the
  // backing store to CPU memory so the Sobel readback doesn't stall on a
  // GPU→CPU texture copy (the logged Canvas2D readback warning).
  const hc = heightC.getContext("2d", { willReadFrequently: true })!;
  hc.fillStyle = "#808080";
  hc.fillRect(0, 0, size, size);
  for (let i = 0; i < 14000; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 20 + Math.random() * (size / 2 - 30);
    const arc = 0.003 + Math.random() * 0.04;
    const lvl = Math.random() * 110;
    hc.strokeStyle =
      Math.random() < 0.5 ? `rgba(255,255,255,${lvl / 255})` : `rgba(0,0,0,${lvl / 255})`;
    hc.lineWidth = 0.3 + Math.random() * 0.5;
    hc.beginPath();
    hc.arc(size / 2, size / 2, r, a, a + arc);
    hc.stroke();
  }
  return {
    color: makeTex(colorC, true, 1),
    // Brushed copper is a shallow micro-grain, not deep relief. normal
    // strength 3.5 + roughness floor 0.18 over 14k high-freq arcs made the
    // metal scintillate under env reflection on rotation. Softer normal +
    // higher roughness floor kills the shimmer, still reads as brushed.
    normal: makeTex(heightToNormal(heightC, 1.8), false, 1),
    roughness: makeTex(heightToRoughness(heightC, 0.26, 0.46), false, 1),
  };
}

function texSetWalnut(size = 512): PbrSet {
  const colorC = document.createElement("canvas");
  colorC.width = colorC.height = size;
  const cc = colorC.getContext("2d")!;
  const grad = cc.createLinearGradient(0, 0, size, 0);
  // Lightened toward the Cycles metal-fixed bake (basecolor_portafilter,
  // 2026-05-16): sampled mean sRGB rgb(190,168,144), bright rgb(227,218,208).
  // The prior espresso-dark stops read far darker than the hero/reference;
  // these keep walnut warmth (not desaturating to the raw bake greige) while
  // lifting luminance ~1.5x. Visually re-tune against the live A/B (todo 9).
  grad.addColorStop(0, "#5a3a22");
  grad.addColorStop(0.3, "#8f6038");
  grad.addColorStop(0.55, "#b08355");
  grad.addColorStop(0.8, "#7d5331");
  grad.addColorStop(1, "#3f2715");
  cc.fillStyle = grad;
  cc.fillRect(0, 0, size, size);
  for (let i = 0; i < 180; i++) {
    const baseX = (i / 180) * size + (Math.random() - 0.5) * 4;
    cc.strokeStyle = `rgba(18,9,3,${0.08 + Math.random() * 0.3})`;
    cc.lineWidth = 0.3 + Math.random() * 1.5;
    cc.beginPath();
    cc.moveTo(baseX, 0);
    for (let y = 0; y <= size; y += 5) {
      const w1 = Math.sin(y * 0.014 + i * 0.5) * 5;
      const w2 = Math.sin(y * 0.004 + i * 0.2) * 10;
      cc.lineTo(baseX + w1 + w2, y);
    }
    cc.stroke();
  }
  for (let i = 0; i < 4; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const r = 10 + Math.random() * 20;
    const g = cc.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, "rgba(12,6,2,0.7)");
    g.addColorStop(1, "rgba(12,6,2,0)");
    cc.fillStyle = g;
    cc.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  const heightC = document.createElement("canvas");
  heightC.width = heightC.height = size;
  // willReadFrequently: these height canvases are read back via
  // getImageData in heightToNormal/heightToRoughness. The hint moves the
  // backing store to CPU memory so the Sobel readback doesn't stall on a
  // GPU→CPU texture copy (the logged Canvas2D readback warning).
  const hc = heightC.getContext("2d", { willReadFrequently: true })!;
  hc.fillStyle = "#808080";
  hc.fillRect(0, 0, size, size);
  for (let i = 0; i < 180; i++) {
    const baseX = (i / 180) * size + (Math.random() - 0.5) * 4;
    const intensity = 30 + Math.random() * 60;
    hc.strokeStyle = `rgba(${128 - intensity},${128 - intensity},${128 - intensity},0.9)`;
    hc.lineWidth = 0.4 + Math.random() * 1.4;
    hc.beginPath();
    hc.moveTo(baseX, 0);
    for (let y = 0; y <= size; y += 5) {
      const w1 = Math.sin(y * 0.014 + i * 0.5) * 5;
      const w2 = Math.sin(y * 0.004 + i * 0.2) * 10;
      hc.lineTo(baseX + w1 + w2, y);
    }
    hc.stroke();
  }
  return {
    color: makeTex(colorC, true, 1),
    normal: makeTex(heightToNormal(heightC, 2.0), false, 1),
    roughness: makeTex(heightToRoughness(heightC, 0.38, 0.62), false, 1),
  };
}

// ── Special textures ─────────────────────────────────────────────────────
function texGaugeFace(): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createRadialGradient(s / 2, s / 2, 30, s / 2, s / 2, s / 2);
  grad.addColorStop(0, "#eab27a");
  grad.addColorStop(0.5, "#c08148");
  grad.addColorStop(0.9, "#8a5028");
  grad.addColorStop(1, "#5a3418");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2 - 4, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 8000; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 40 + Math.random() * (s / 2 - 80);
    ctx.strokeStyle = `rgba(255,220,180,${Math.random() * 0.14})`;
    ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, r, a, a + 0.02);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(s / 2, s / 2);
  for (let i = 0; i <= 40; i++) {
    const a = -Math.PI * 1.25 + (i / 40) * Math.PI * 1.5;
    const major = i % 5 === 0;
    const r1 = s / 2 - 38;
    const r2 = major ? s / 2 - 72 : s / 2 - 56;
    ctx.strokeStyle = major ? "rgba(25,12,5,0.92)" : "rgba(25,12,5,0.7)";
    ctx.lineWidth = major ? 3.4 : 1.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
    ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(25,12,5,0.95)";
  ctx.font = "bold 32px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ["0", "4", "8", "12", "16"].forEach((l, idx) => {
    const a = -Math.PI * 1.25 + (idx / 4) * Math.PI * 1.5;
    const r = s / 2 - 100;
    ctx.fillText(l, Math.cos(a) * r, Math.sin(a) * r);
  });
  ctx.font = "italic 15px Georgia, serif";
  ctx.fillStyle = "rgba(25,12,5,0.75)";
  ctx.fillText("BAR · PRESSURE", 0, -s / 4);
  ctx.font = "11px Georgia, serif";
  ctx.fillText("ARTIGIANALE · ITALIA", 0, s / 4);
  ctx.strokeStyle = "rgba(170,40,20,0.75)";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(0, 0, s / 2 - 50, Math.PI * 0.05, Math.PI * 0.25);
  ctx.stroke();
  const angle = -Math.PI * 1.25 + 0.62 * Math.PI * 1.5;
  ctx.rotate(angle);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.moveTo(-4, -6);
  ctx.lineTo(4, -6);
  ctx.lineTo(2, -s / 2 + 60);
  ctx.lineTo(-2, -s / 2 + 60);
  ctx.closePath();
  ctx.fill();
  ctx.translate(-1, -2);
  ctx.fillStyle = "#1a1a1c";
  ctx.beginPath();
  ctx.moveTo(-3, -8);
  ctx.lineTo(3, -8);
  ctx.lineTo(1.5, -s / 2 + 58);
  ctx.lineTo(-1.5, -s / 2 + 58);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c98a4b";
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  return t;
}

function texLCD(): THREE.CanvasTexture {
  const w = 512;
  const h = 280;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#06090c";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(201,138,75,0.2)";
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.fillStyle = "rgba(201,138,75,0.22)";
  ctx.fillRect(8, 8, w - 16, 38);
  ctx.fillStyle = "#c98a4b";
  ctx.font = "bold 18px monospace";
  ctx.textAlign = "left";
  ctx.fillText("● ESPRESSO", 22, 34);
  ctx.textAlign = "right";
  ctx.fillText("25.6g", w - 22, 34);
  ctx.fillStyle = "#e3a263";
  ctx.font = "bold 84px monospace";
  ctx.textAlign = "center";
  ctx.fillText("93°", w / 2 - 30, 138);
  ctx.font = "28px monospace";
  ctx.fillStyle = "rgba(227,162,99,0.7)";
  ctx.fillText("C", w / 2 + 78, 114);
  ctx.strokeStyle = "rgba(201,138,75,0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(46, 168, w - 92, 18);
  ctx.fillStyle = "#e3a263";
  ctx.fillRect(48, 170, (w - 96) * 0.72, 14);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "15px monospace";
  ctx.textAlign = "center";
  ctx.fillText("PRE-INFUSION · 9.0 BAR · 28s", w / 2, 212);
  ctx.fillStyle = "rgba(140,210,140,0.85)";
  ctx.font = "bold 15px monospace";
  ctx.fillText("● READY", w / 2, 248);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function texMesh(repeat = 6, dark = "#16161a", light = "#9a9aa0"): THREE.CanvasTexture {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = dark;
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = light;
  ctx.lineWidth = 1.6;
  for (let i = 0; i <= s; i += 10) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(s, i);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, s);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(180,180,184,0.4)";
  ctx.lineWidth = 0.8;
  for (let i = -s; i <= s * 2; i += 14) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + s, s);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  return t;
}

function texChevronGrate(): THREE.CanvasTexture {
  const Wd = 1024;
  const Hd = 384;
  const c = document.createElement("canvas");
  c.width = Wd;
  c.height = Hd;
  const ctx = c.getContext("2d")!;
  const bg = ctx.createLinearGradient(0, 0, 0, Hd);
  bg.addColorStop(0, "#a8a8ac");
  bg.addColorStop(0.5, "#cccccf");
  bg.addColorStop(1, "#9a9a9e");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, Wd, Hd);
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * Wd;
    const y = Math.random() * Hd;
    const len = 30 + Math.random() * 120;
    ctx.strokeStyle = `rgba(255,255,255,${Math.random() * 0.14})`;
    ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y);
    ctx.stroke();
  }
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * Wd;
    const y = Math.random() * Hd;
    const len = 30 + Math.random() * 120;
    ctx.strokeStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
    ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#070709";
  const cx = Wd / 2;
  const cy = Hd / 2;
  const rows = 4;
  const rowH = (Hd - 32) / rows;
  for (let row = 0; row < rows; row++) {
    const y = 16 + row * rowH + rowH / 2;
    const slotH = rowH * 0.42;
    const chevPerSide = 4;
    const chevW = (cx - 70) / chevPerSide;
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < chevPerSide; i++) {
        const dist = 55 + i * chevW;
        const apex = cx + side * dist;
        const tail = cx + side * (dist + chevW * 0.78);
        const thickness = 9;
        const apexBack = apex - side * thickness;
        const tailBack = tail - side * thickness;
        ctx.beginPath();
        ctx.moveTo(tail, y - slotH / 2);
        ctx.lineTo(apex, y);
        ctx.lineTo(tail, y + slotH / 2);
        ctx.lineTo(tailBack, y + slotH / 2);
        ctx.lineTo(apexBack, y);
        ctx.lineTo(tailBack, y - slotH / 2);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(cx, cy, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 29, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, 31, 0, Math.PI * 2);
  ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  return t;
}

function texBasket(): THREE.CanvasTexture {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#d8d8dc";
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = "#0a0a0c";
  const step = 9;
  for (let y = step / 2; y < s; y += step) {
    for (let x = step / 2; x < s; x += step) {
      const off = (Math.floor(y / step) % 2) * (step / 2);
      ctx.beginPath();
      ctx.arc(x + off, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function texButtonIcon(type: "power" | "light" | "cup"): THREE.CanvasTexture {
  const s = 128;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#16161a";
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = "#c98a4b";
  ctx.fillStyle = "#c98a4b";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  if (type === "power") {
    ctx.beginPath();
    ctx.arc(s / 2, s / 2 + 4, 22, -Math.PI * 0.35, Math.PI + Math.PI * 0.35, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s / 2, s / 2 - 22);
    ctx.lineTo(s / 2, s / 2 + 4);
    ctx.stroke();
  } else if (type === "light") {
    ctx.beginPath();
    ctx.arc(s / 2, s / 2 - 4, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s / 2 - 10, s / 2 + 16);
    ctx.lineTo(s / 2 + 10, s / 2 + 16);
    ctx.moveTo(s / 2 - 8, s / 2 + 24);
    ctx.lineTo(s / 2 + 8, s / 2 + 24);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(s / 2 - 22, s / 2 - 12);
    ctx.lineTo(s / 2 - 22, s / 2 + 8);
    ctx.quadraticCurveTo(s / 2 - 22, s / 2 + 22, s / 2 - 8, s / 2 + 22);
    ctx.lineTo(s / 2 + 8, s / 2 + 22);
    ctx.quadraticCurveTo(s / 2 + 22, s / 2 + 22, s / 2 + 22, s / 2 + 8);
    ctx.lineTo(s / 2 + 22, s / 2 - 12);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(s / 2 + 26, s / 2 + 2, 8, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ── Geometry helper ──────────────────────────────────────────────────────
function box(w: number, h: number, d: number, r: number) {
  const safe = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  return new RoundedBoxGeometry(w, h, d, 4, Math.max(safe, 1e-4));
}

/**
 * Build the machine. Group: base on Y=0, centred X/Z. Materials read the
 * scene environment (provided by R3F <Environment>) for reflections.
 */
export function buildEspressoMachine(): THREE.Group {
  // Canonical body albedo = linear 0.043 (sRGB ≈ #3a3a3a), confirmed by
  // the metal-fixed bake (basecolor_body_main linear 0.0414). Prior
  // #1c1c1f (linear ~0.011) read darker than the Cycles hero. #343438
  // sits just under canonical to offset the metalness 0.85 + envMap lift
  // (keeps the faint cool tint). Visually confirm against A/B (todo 9).
  const setBody = texSetSatinMetal("#343438", 512);
  const setCopper = texSetCopper(512);
  const setWalnut = texSetWalnut(512);
  const T = {
    gauge: texGaugeFace(),
    lcd: texLCD(),
    meshTop: texMesh(5),
    meshSmall: texMesh(3),
    grate: texChevronGrate(),
    basket: texBasket(),
    iconPower: texButtonIcon("power"),
    iconLight: texButtonIcon("light"),
    iconCup: texButtonIcon("cup"),
  };

  const M = {
    body: new THREE.MeshStandardMaterial({
      map: setBody.color,
      normalMap: setBody.normal,
      normalScale: new THREE.Vector2(0.45, 0.45), // anti-fry: 0.6→0.45
      roughnessMap: setBody.roughness,
      metalness: 0.85,
      roughness: 1.0,
      envMapIntensity: 0.7,
    }),
    bodyDark: new THREE.MeshStandardMaterial({
      color: 0x070708,
      metalness: 0.4,
      roughness: 0.7,
      envMapIntensity: 0.5,
    }),
    copperMatte: new THREE.MeshStandardMaterial({
      map: setCopper.color,
      normalMap: setCopper.normal,
      normalScale: new THREE.Vector2(0.32, 0.32), // anti-fry: 0.7→0.5→0.32
      roughnessMap: setCopper.roughness,
      metalness: 1.0,
      roughness: 1.0,
      // envMapIntensity ~0.7 across all metals: with the env now blurred
      // (ProductViewer), the reflected sheen is soft; lowering how MUCH
      // of it shows kills the orbiting "riflessi/luccichio" crawl while
      // staying matte-coherent with the Cycles hero. Zero GPU cost.
      envMapIntensity: 0.72,
    }),
    copperBright: new THREE.MeshStandardMaterial({
      color: 0xc78250,
      metalness: 1.0,
      roughness: 0.3, // anti-fry: 0.16→0.22→0.30
      envMapIntensity: 0.7,
    }),
    copperEdge: new THREE.MeshStandardMaterial({
      color: 0xa0623a,
      metalness: 1.0,
      roughness: 0.33, // anti-fry: 0.25→0.33 (thin trim edges crawl)
      envMapIntensity: 0.65,
    }),
    chrome: new THREE.MeshStandardMaterial({
      color: 0xeeeef0,
      metalness: 1.0,
      // Anti-fry pass: 0.13→0.19 + envMapIntensity 1.4→1.05. The big new
      // monoblock spout/wings made chrome the #2 boiler under auto-rotate
      // (only SMAA, no temporal AA, weak iGPU). Wider lobe + dimmer env =
      // no sub-pixel crawl. GPU cost unchanged.
      roughness: 0.19,
      envMapIntensity: 0.7,
    }),
    chromeBrushed: new THREE.MeshStandardMaterial({
      color: 0xc8c8cc,
      metalness: 1.0,
      roughness: 0.28,
      envMapIntensity: 0.7,
    }),
    steel: new THREE.MeshStandardMaterial({
      color: 0xb8b8bc,
      metalness: 1.0,
      roughness: 0.3, // anti-fry: 0.22→0.30 (small metal lugs sparkle)
      envMapIntensity: 0.65,
    }),
    walnut: new THREE.MeshStandardMaterial({
      map: setWalnut.color,
      normalMap: setWalnut.normal,
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughnessMap: setWalnut.roughness,
      metalness: 0.0,
      roughness: 1.0,
      envMapIntensity: 0.45,
    }),
    rubber: new THREE.MeshStandardMaterial({
      color: 0x06060a,
      metalness: 0.0,
      roughness: 0.92,
    }),
    plastic: new THREE.MeshStandardMaterial({
      color: 0x0c0c0e,
      metalness: 0.05,
      roughness: 0.6,
    }),
    lcd: new THREE.MeshStandardMaterial({
      map: T.lcd,
      metalness: 0.0,
      roughness: 0.18,
      emissive: new THREE.Color(0xffffff),
      emissiveMap: T.lcd,
      emissiveIntensity: 1.6,
      envMapIntensity: 0.2,
    }),
    gauge: new THREE.MeshStandardMaterial({
      map: T.gauge,
      metalness: 0.55,
      roughness: 0.35,
      envMapIntensity: 0.6,
    }),
    gaugeGlass: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.0,
      transmission: 0.95,
      thickness: 0.08,
      transparent: true,
      opacity: 0.5,
      envMapIntensity: 1.2,
      ior: 1.5,
    }),
    meshTop: new THREE.MeshStandardMaterial({
      map: T.meshTop,
      metalness: 0.65, // anti-fry: patterned metal grille → moiré
      roughness: 0.55,
      envMapIntensity: 0.8,
    }),
    meshSmall: new THREE.MeshStandardMaterial({
      map: T.meshSmall,
      metalness: 0.65, // anti-fry: patterned metal grille → moiré
      roughness: 0.55,
      envMapIntensity: 0.8,
    }),
    grate: new THREE.MeshStandardMaterial({
      map: T.grate,
      metalness: 0.65, // anti-fry: chevron grille was a strong moiré source
      roughness: 0.55,
      envMapIntensity: 0.8,
    }),
    basket: new THREE.MeshStandardMaterial({
      map: T.basket,
      metalness: 0.65, // anti-fry: fine mesh weave + metal → moiré
      roughness: 0.55,
      envMapIntensity: 0.8,
    }),
    switchRed: new THREE.MeshStandardMaterial({
      color: 0x8a1a10,
      metalness: 0.2,
      roughness: 0.5,
      emissive: new THREE.Color(0x4a0a04),
      emissiveIntensity: 0.25,
    }),
  };
  const btnMat = (icon: THREE.CanvasTexture) =>
    new THREE.MeshStandardMaterial({
      map: icon,
      metalness: 0.3,
      roughness: 0.4,
      emissive: new THREE.Color(0x4a3520),
      emissiveMap: icon,
      emissiveIntensity: 0.6,
      envMapIntensity: 0.5,
    });

  const m = new THREE.Group();
  m.name = "espresso-machine";
  const add = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    pos?: [number, number, number],
    rot?: [number, number, number],
  ) => {
    const mesh = new THREE.Mesh(geo, mat);
    if (pos) mesh.position.set(...pos);
    if (rot) mesh.rotation.set(...rot);
    mesh.castShadow = mesh.receiveShadow = true;
    m.add(mesh);
    return mesh;
  };

  // Base
  add(box(W, HB, D, 0.05), M.body, [0, HB / 2, 0]);

  // Drip tray + steel frame + screws
  const gW = W * 0.78;
  const gD = SB - 0.08;
  const ft = 0.04;
  add(new THREE.BoxGeometry(gW + 0.05, 0.07, gD + 0.05), M.bodyDark, [0, HB - 0.025, GRATE_Z]);
  add(new THREE.BoxGeometry(ft, 0.05, gD + ft * 2), M.chromeBrushed, [-gW / 2 - ft / 2, GRATE_Y, GRATE_Z]);
  add(new THREE.BoxGeometry(ft, 0.05, gD + ft * 2), M.chromeBrushed, [gW / 2 + ft / 2, GRATE_Y, GRATE_Z]);
  add(new THREE.BoxGeometry(gW, 0.05, ft), M.chromeBrushed, [0, GRATE_Y, GRATE_Z + gD / 2 + ft / 2]);
  add(new THREE.BoxGeometry(gW, 0.05, ft), M.chromeBrushed, [0, GRATE_Y, GRATE_Z - gD / 2 - ft / 2]);
  add(new THREE.BoxGeometry(gW, 0.022, gD), M.grate, [0, GRATE_Y + 0.005, GRATE_Z]);
  ([[-1, -1], [1, -1], [-1, 1], [1, 1]] as const).forEach(([sx, sz]) => {
    add(
      new THREE.CylinderGeometry(0.022, 0.022, 0.025, 16),
      M.chromeBrushed,
      [sx * (gW / 2 + ft / 2), GRATE_Y + 0.015, GRATE_Z + sz * (gD / 2 + ft / 2)],
    );
  });

  // Lower body + copper edge
  add(box(W, HL, D - SB, 0.06), M.body, [0, HB + HL / 2, -SB / 2]);
  add(new THREE.BoxGeometry(W * 0.99, 0.022, 0.022), M.copperEdge, [0, HB + HL - 0.005, (D - SB) / 2 - SB / 2 - 0.012]);

  // Side vents
  const sideVents = (sx: number) => {
    add(new THREE.BoxGeometry(0.015, 0.85, 0.65), M.bodyDark, [sx * 0.998, HB + HL * 0.55, -SB / 2]);
    for (let i = 0; i < 15; i++) {
      add(new THREE.BoxGeometry(0.02, 0.7, 0.022), M.bodyDark, [sx * 1.005, HB + HL * 0.55, -SB / 2 + (i - 7) * 0.04]);
    }
  };
  sideVents(W / 2);
  sideVents(-W / 2);

  // Upper housing + copper edges
  add(box(W, HU, D, 0.08), M.body, [0, HB + HL + HU / 2, 0]);
  add(new THREE.BoxGeometry(W * 0.99, 0.025, 0.025), M.copperEdge, [0, HB + HL + HU - 0.015, D / 2 - 0.01]);
  ([-1, 1] as const).forEach((sx) =>
    add(new THREE.BoxGeometry(0.025, 0.025, D * 0.99), M.copperEdge, [sx * (W / 2 - 0.01), HB + HL + HU - 0.015, 0]),
  );

  // Top: cup warmer + tamper rest + tank
  add(new THREE.BoxGeometry(W * 0.55, 0.03, D * 0.78), M.bodyDark, [-W * 0.1, TOP_Y - 0.005, 0]);
  add(new THREE.BoxGeometry(W * 0.5, 0.025, D * 0.72), M.meshTop, [-W * 0.1, TOP_Y + 0.02, 0]);
  add(new THREE.BoxGeometry(W * 0.18, 0.03, D * 0.18), M.bodyDark, [W * 0.3, TOP_Y - 0.005, -D * 0.2]);
  add(new THREE.BoxGeometry(W * 0.16, 0.025, D * 0.16), M.meshSmall, [W * 0.3, TOP_Y + 0.018, -D * 0.2]);
  add(new THREE.BoxGeometry(W * 0.16, 0.018, 0.06), M.bodyDark, [W * 0.25, TOP_Y + 0.025, D * 0.32]);
  add(new THREE.BoxGeometry(W * 0.1, 0.025, 0.04), M.copperBright, [W * 0.25, TOP_Y + 0.034, D * 0.32]);

  // Front: LCD
  add(new THREE.BoxGeometry(0.92, 0.56, 0.04), M.bodyDark, [-0.4, UY + 0.18, FZ + 0.018]);
  add(new THREE.PlaneGeometry(0.86, 0.5), M.lcd, [-0.4, UY + 0.18, FZ + 0.041]);

  // Gauge with knurled bezel — metal, not copper (steel case + chrome
  // trim). Copper elsewhere (group head, body edges) is intentionally
  // left untouched.
  const gauge = new THREE.Group();
  const gCase = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.2, 64), M.chromeBrushed);
  gCase.rotation.x = Math.PI / 2;
  gCase.position.z = -0.08;
  gauge.add(gCase);
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const k = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.045, 0.06), M.chrome);
    k.position.set(Math.cos(a) * 0.36, Math.sin(a) * 0.36, 0);
    k.rotation.z = a + Math.PI / 2;
    gauge.add(k);
  }
  const gRingIn = new THREE.Mesh(new THREE.TorusGeometry(0.295, 0.018, 8, 48), M.chrome);
  gauge.add(gRingIn);
  const gFace = new THREE.Mesh(new THREE.CircleGeometry(0.28, 64), M.gauge);
  gFace.position.z = 0.022;
  gauge.add(gFace);
  const gGlass = new THREE.Mesh(
    new THREE.SphereGeometry(0.29, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.18),
    M.gaugeGlass,
  );
  gGlass.rotation.x = -Math.PI / 2;
  gGlass.position.z = 0.058;
  gauge.add(gGlass);
  // The knurled bezel reached radius ~0.38; at X=0.65 its right edge hit
  // X≈1.03, past the body's right wall (W/2=1.025) — it visibly poked out.
  // It was also ~3× the 50 mm spec next to the 3.5″ LCD. Scale the whole
  // group to 0.72 (keeps internal proportions) and nudge it inboard so it
  // sits flush and reads as a compact dial beside the screen.
  gauge.scale.setScalar(0.72);
  gauge.position.set(0.6, UY + 0.18, FZ + 0.06);
  gauge.traverse((o) => {
    const me = o as THREE.Mesh;
    if (me.isMesh) me.castShadow = me.receiveShadow = true;
  });
  m.add(gauge);

  // Buttons
  const makeButton = (x: number, y: number, icon: THREE.CanvasTexture) => {
    const g = new THREE.Group();
    const bg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.018, 32), M.bodyDark);
    bg.rotation.x = Math.PI / 2;
    g.add(bg);
    // Physical button pad — NO icon on the cylinder cap. The cap's radial
    // UV + the old pad.rotation.x=-π/2 turned every glyph sideways
    // ("icone rivolte verso sinistra"). Icon is a flat front decal below.
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.025, 32), M.plastic);
    pad.rotation.x = Math.PI / 2;
    pad.position.z = 0.012;
    g.add(pad);
    // Icon decal: CircleGeometry lies in XY → normal +Z (faces the viewer)
    // with deterministic upright UVs, so the glyph is forward and level.
    const iconDecal = new THREE.Mesh(new THREE.CircleGeometry(0.062, 48), btnMat(icon));
    iconDecal.position.z = 0.026;
    g.add(iconDecal);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.008, 12, 32), M.copperEdge);
    ring.position.z = 0.012;
    g.add(ring);
    g.position.set(x, y, FZ + 0.015);
    m.add(g);
  };
  // Centred under the LCD (display centre x = -0.40) instead of the old
  // x=-0.58 group centre, which sat ~0.18 left of the screen. Same 0.24
  // spacing; MACHINE_ANCHORS.buttons updated to match (hotspot pin).
  makeButton(-0.64, UY - 0.2, T.iconPower);
  makeButton(-0.4, UY - 0.2, T.iconLight);
  makeButton(-0.16, UY - 0.2, T.iconCup);

  // Group head — turned copper collar with a CONTINUOUSLY CONVEX profile
  // (radius swells to a max mid-height, curves back in at both ends): a
  // rounded toroidal "bombato" mass, NOT a straight-walled barrel (the
  // old profile had a flat 0.355 section → still read "piatto"). Same Z
  // extent (GH_Z-0.03 .. GH_Z+0.27) so every tuned anchor stays valid.
  const ghProfile: [number, number][] = [
    [0.24, 0.0], [0.3, 0.03], [0.315, 0.075], [0.318, 0.13],
    [0.315, 0.185], [0.305, 0.235], [0.285, 0.27], [0.235, 0.3],
  ];
  const gho = new THREE.Mesh(
    new THREE.LatheGeometry(
      ghProfile.map(([r, h]) => new THREE.Vector2(r, h)),
      64,
    ),
    M.copperMatte,
  );
  gho.rotation.x = Math.PI / 2;
  gho.position.set(0, GH_Y, GH_Z - 0.03);
  gho.castShadow = true;
  m.add(gho);
  // Polished copper highlight band — a rounded TORUS around the bulge,
  // not a flat-faced disc. Collar axis is +Z (gho rotated), so a default
  // torus (hole axis Z) wraps it with no rotation.
  const gr = new THREE.Mesh(
    new THREE.TorusGeometry(0.322, 0.02, 16, 64),
    M.copperBright,
  );
  gr.position.set(0, GH_Y, GH_Z + 0.1);
  m.add(gr);
  // Small bright fillet where the collar meets the black body.
  const grt = new THREE.Mesh(
    new THREE.TorusGeometry(0.255, 0.016, 14, 64),
    M.copperBright,
  );
  grt.position.set(0, GH_Y, GH_Z - 0.02);
  m.add(grt);
  // Copper enclosure — a CLOSED 360° shell. The profile curls back to a
  // small radius at BOTH the top and the bottom, so it's a continuous
  // copper dome around the screen/spout with no annular see-through gap
  // ("la gonna deve essere completa e chiusa a 360 gradi"). Double-sided
  // so a back-face never culls into a dark hole from below.
  const copperShell = M.copperMatte.clone();
  copperShell.side = THREE.DoubleSide;
  const apronProfile: [number, number][] = [
    // Wide copper cap raised +0.15 (decisive, not timid steps): covers
    // out to r~0.34 at the top with only a small centre hole, then a
    // wall down to the unchanged dome. Seals high against the group head,
    // no annular gap. Lower dome (from [0.3,0.0] down) unchanged.
    [0.075, 0.365], [0.18, 0.375], [0.27, 0.375], [0.32, 0.36],
    [0.337, 0.32], [0.338, 0.25], [0.335, 0.17], [0.325, 0.09],
    [0.31, 0.035], [0.3, 0.0],
    [0.335, -0.04],
    [0.33, -0.085], [0.3, -0.12], [0.24, -0.15], [0.16, -0.172],
    [0.1, -0.185],
  ];
  const showerApron = new THREE.Mesh(
    new THREE.LatheGeometry(
      apronProfile.map(([r, y]) => new THREE.Vector2(r, y)),
      64,
    ),
    copperShell,
  );
  showerApron.position.set(0, GH_Y - 0.02, GH_Z + 0.12);
  showerApron.castShadow = true;
  m.add(showerApron);
  const showerMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.016, 48), M.basket);
  showerMesh.position.set(0, GH_Y - 0.135, GH_Z + 0.12);
  m.add(showerMesh);

  // Portafilter
  const PF = new THREE.Group();
  PF.add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.07, 48), M.chrome));
  const pfRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.012, 12, 48), M.chrome);
  pfRing.rotation.x = Math.PI / 2;
  pfRing.position.y = 0.038;
  PF.add(pfRing);
  // Polished stainless bayonet ridges for portafilter insertion (3 lugs
  // around the steel body, "clearly visible" per the spec). M.steel =
  // polished reflective stainless, contrasting the brushed copper above.
  for (let i = 0; i < 3; i++) {
    const lug = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.028, 0.075), M.steel);
    lug.position.set(0.327, 0.004, 0);
    const lp = new THREE.Group();
    lp.add(lug);
    lp.rotation.y = (i / 3) * Math.PI * 2 + Math.PI / 6;
    PF.add(lp);
  }
  const pfCup = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.23, 0.16, 48), M.chrome);
  pfCup.position.y = -0.12;
  PF.add(pfCup);
  const gasket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.245, 0.245, 0.014, 48),
    new THREE.MeshStandardMaterial({ color: 0x06060a, metalness: 0, roughness: 0.9 }),
  );
  gasket.position.y = -0.038;
  PF.add(gasket);
  // Recessed mesh basket — a real cup (woven wall + floor + centre
  // bullet), not the old flat CircleGeometry decal that read "piatto".
  // Opening faces +Y (up into the group head); cavity sinks into the cup.
  // Dedicated double-sided clone so the inner wall renders when you look
  // down into it (M.basket is front-side and shared with the shower).
  const basketMesh = M.basket.clone();
  basketMesh.side = THREE.DoubleSide;
  const pfBasketWall = new THREE.Mesh(
    new THREE.CylinderGeometry(0.225, 0.2, 0.1, 48, 1, true),
    basketMesh,
  );
  pfBasketWall.position.y = -0.095;
  PF.add(pfBasketWall);
  const pfBasketFloor = new THREE.Mesh(new THREE.CircleGeometry(0.2, 48), basketMesh);
  pfBasketFloor.rotation.x = -Math.PI / 2;
  pfBasketFloor.position.y = -0.144;
  PF.add(pfBasketFloor);
  const pfBasketRim = new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.008, 10, 48), M.chrome);
  pfBasketRim.rotation.x = Math.PI / 2;
  pfBasketRim.position.y = -0.044;
  PF.add(pfBasketRim);
  // Bottomless-portafilter support spider: a 3-spoke chrome bracket with
  // a centre hub, just above the mesh floor — what's dead centre in the
  // top-view reference, not a plain dome.
  const pfSpider = new THREE.Group();
  pfSpider.add(
    new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.05, 0.055, 24), M.chrome),
  );
  for (let i = 0; i < 3; i++) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.185, 0.022, 0.05), M.chrome);
    arm.position.x = 0.092;
    const armPivot = new THREE.Group();
    armPivot.add(arm);
    armPivot.rotation.y = (i / 3) * Math.PI * 2;
    pfSpider.add(armPivot);
  }
  pfSpider.position.y = -0.123;
  PF.add(pfSpider);
  // Twin pour spout: copper skirt (gonna) → chrome boss → two blade-like
  // arms that sweep out then curve their tips back IN and down (the
  // wishbone "horns" in the reference close-ups), not thin round tubes.
  const pfSpout = new THREE.Group();
  // Copper skirt where the spout meets the portafilter underside — the
  // "gonna" that was missing.
  const spoutSkirtProfile: [number, number][] = [
    [0.05, 0.085], [0.085, 0.06], [0.108, 0.025], [0.11, 0.0],
    [0.1, -0.022], [0.07, -0.04], [0.055, -0.05],
  ];
  const spoutSkirt = new THREE.Mesh(
    new THREE.LatheGeometry(
      spoutSkirtProfile.map(([r, y]) => new THREE.Vector2(r, y)),
      48,
    ),
    copperShell,
  );
  pfSpout.add(spoutSkirt);
  // Per the single-part photo: a central threaded boss + TWO mirrored
  // concave crescent wings that splay out, drop, and curl the tip back
  // up. M.chrome stays roughness 0.13 (not near-mirror): the codebase
  // deliberately avoids near-mirror chrome — it boils under auto-rotation
  // on the weak kiosk iGPU. High segment counts to kill the faceting
  // ("ancora un po' pixelato").
  const spoutBoss = new THREE.Mesh(
    new THREE.CylinderGeometry(0.092, 0.082, 0.14, 40),
    M.chrome,
  );
  spoutBoss.position.y = -0.04;
  spoutBoss.castShadow = true;
  pfSpout.add(spoutBoss);
  const spoutBore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.052, 0.13, 28, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x050506,
      metalness: 0,
      roughness: 0.95,
      side: THREE.DoubleSide,
    }),
  );
  spoutBore.position.y = -0.035;
  pfSpout.add(spoutBore);
  // Concave crescent cross-section, swept along a planar horn path
  // (X-Y plane → stable extrude frame). Built once, mirrored for the
  // second wing via scale.x = -1.
  const wingCross = new THREE.Shape();
  wingCross.absarc(0, 0, 0.115, Math.PI * 1.16, Math.PI * 1.84, false);
  wingCross.absarc(0, 0, 0.084, Math.PI * 1.84, Math.PI * 1.16, true);
  wingCross.closePath();
  // Flatter than before — "meno curvato verso il basso": splays out
  // more, plunges less (max depth ~-0.23 instead of -0.36), gentler tip.
  const wingPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.025, -0.05, 0),
    new THREE.Vector3(0.105, -0.075, 0),
    new THREE.Vector3(0.175, -0.115, 0),
    new THREE.Vector3(0.21, -0.165, 0),
    new THREE.Vector3(0.205, -0.205, 0),
    new THREE.Vector3(0.175, -0.23, 0),
  ]);
  const wingGeo = new THREE.ExtrudeGeometry(wingCross, {
    steps: 96,
    curveSegments: 24,
    bevelEnabled: false,
    extrudePath: wingPath,
  });
  for (const s of [-1, 1] as const) {
    const wing = new THREE.Mesh(wingGeo, M.chrome);
    wing.scale.x = s;
    wing.castShadow = true;
    pfSpout.add(wing);
  }
  pfSpout.position.y = -0.2;
  PF.add(pfSpout);
  // Chrome stem bridging the portafilter body to the walnut handle. Was
  // length 0.1 ending at x≈-0.37 while the handle base sits at x≈-0.62 →
  // the handle floated with a ~0.25 gap ("manico sospeso nel vuoto").
  // Now spans the body edge (-0.30) to the handle base (-0.64).
  const pfNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.34, 24), M.chrome);
  pfNeck.rotation.z = Math.PI / 2;
  pfNeck.position.set(-0.47, 0, 0);
  PF.add(pfNeck);
  const profile: [number, number][] = [
    [0.0, 0.022], [0.025, 0.048], [0.06, 0.072], [0.11, 0.09],
    [0.18, 0.103], [0.28, 0.115], [0.4, 0.124], [0.52, 0.13],
    [0.62, 0.132], [0.72, 0.13], [0.8, 0.122], [0.87, 0.108],
    [0.92, 0.086], [0.96, 0.055], [0.99, 0.022], [1.0, 0.003],
  ];
  const HL_LEN = 0.66;
  const handle = new THREE.Mesh(
    new THREE.LatheGeometry(
      profile.map(([t, r]) => new THREE.Vector2(r, t * HL_LEN)),
      32,
    ),
    M.walnut,
  );
  handle.rotation.z = Math.PI / 2;
  handle.position.set(-0.62, 0, 0);
  handle.castShadow = true;
  PF.add(handle);
  // Chrome ferrule at the wood/metal junction (handle base ≈ x -0.62).
  const hCap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 24, 16), M.chrome);
  hCap.position.set(-0.6, 0, 0);
  PF.add(hCap);
  PF.position.set(0, GH_Y - 0.17, GH_Z + 0.12);
  PF.traverse((o) => {
    const me = o as THREE.Mesh;
    if (me.isMesh) me.castShadow = me.receiveShadow = true;
  });
  m.add(PF);

  // Steam wand
  const wand = new THREE.Group();
  wand.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 24), M.chrome));
  const wGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.14, 24), M.rubber);
  wGrip.position.y = -0.105;
  wand.add(wGrip);
  const wandCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.18, 0),
    new THREE.Vector3(0.01, -0.42, 0.03),
    new THREE.Vector3(0.015, -0.7, 0.06),
    new THREE.Vector3(0.015, -1.0, 0.06),
  ]);
  wand.add(new THREE.Mesh(new THREE.TubeGeometry(wandCurve, 40, 0.028, 16, false), M.chrome));
  const tipGroup = new THREE.Group();
  const tipProfile = [
    new THREE.Vector2(0.026, 0.0), new THREE.Vector2(0.03, 0.012),
    new THREE.Vector2(0.038, 0.025), new THREE.Vector2(0.046, 0.04),
    new THREE.Vector2(0.052, 0.056), new THREE.Vector2(0.054, 0.072),
    new THREE.Vector2(0.052, 0.084), new THREE.Vector2(0.046, 0.094),
    new THREE.Vector2(0.038, 0.1), new THREE.Vector2(0.03, 0.103),
    new THREE.Vector2(0.022, 0.104), new THREE.Vector2(0.0, 0.105),
  ];
  tipGroup.add(new THREE.Mesh(new THREE.LatheGeometry(tipProfile, 32), M.copperMatte));
  const holeMat = new THREE.MeshStandardMaterial({ color: 0x040405, metalness: 0, roughness: 0.95 });
  const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.012, 12), holeMat);
  ch.position.set(0, 0.1, 0);
  tipGroup.add(ch);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.012, 10), holeMat);
    hl.position.set(Math.cos(a) * 0.02, 0.1, Math.sin(a) * 0.02);
    tipGroup.add(hl);
  }
  tipGroup.position.set(0.015, -0.95, 0.06);
  tipGroup.rotation.x = Math.PI;
  wand.add(tipGroup);
  wand.position.set(0.62, GH_Y + 0.08, GH_Z + 0.1);
  wand.traverse((o) => {
    const me = o as THREE.Mesh;
    if (me.isMesh) me.castShadow = me.receiveShadow = true;
  });
  m.add(wand);

  // Feet
  ([1, -1] as const).forEach((sx) =>
    ([1, -1] as const).forEach((sz) => {
      add(new THREE.CylinderGeometry(0.072, 0.075, 0.025, 20), M.chromeBrushed, [
        sx * (W / 2 - 0.13), 0.075, sz * (D / 2 - 0.13),
      ]);
      add(new THREE.CylinderGeometry(0.075, 0.085, 0.055, 20), M.rubber, [
        sx * (W / 2 - 0.13), 0.027, sz * (D / 2 - 0.13),
      ]);
    }),
  );

  // Back panel
  const BZ = -D / 2 - 0.001;
  add(new THREE.BoxGeometry(W * 0.72, HU * 0.62, 0.015), M.bodyDark, [0, UY + 0.05, BZ]);
  for (let i = 0; i < 24; i++) {
    add(new THREE.BoxGeometry(0.035, HU * 0.5, 0.006), M.body, [-W * 0.32 + i * 0.029, UY + 0.05, BZ - 0.006]);
  }
  add(new THREE.BoxGeometry(0.62, 0.2, 0.018), M.bodyDark, [0, HB + 0.18, BZ - 0.005]);
  add(new THREE.BoxGeometry(0.13, 0.085, 0.025), M.bodyDark, [-0.22, HB + 0.18, BZ - 0.012]);
  add(new THREE.BoxGeometry(0.11, 0.035, 0.022), M.switchRed, [-0.22, HB + 0.195, BZ - 0.024], [-0.15, 0, 0]);
  add(
    new THREE.BoxGeometry(0.11, 0.035, 0.022),
    new THREE.MeshStandardMaterial({ color: 0x6a1208, metalness: 0.2, roughness: 0.6 }),
    [-0.22, HB + 0.16, BZ - 0.018],
    [0.15, 0, 0],
  );
  add(new THREE.BoxGeometry(0.22, 0.15, 0.028), M.plastic, [0, HB + 0.18, BZ - 0.014]);
  add(new THREE.BoxGeometry(0.18, 0.12, 0.025), M.bodyDark, [0, HB + 0.18, BZ - 0.022]);
  add(new THREE.BoxGeometry(0.018, 0.055, 0.018), M.steel, [-0.035, HB + 0.2, BZ - 0.028]);
  add(new THREE.BoxGeometry(0.018, 0.055, 0.018), M.steel, [0.035, HB + 0.2, BZ - 0.028]);
  add(new THREE.BoxGeometry(0.018, 0.055, 0.018), M.steel, [0, HB + 0.14, BZ - 0.028]);
  ([-0.085, 0.085] as const).forEach((x) =>
    add(new THREE.CylinderGeometry(0.008, 0.008, 0.008, 12), M.chrome, [x, HB + 0.18, BZ - 0.025], [Math.PI / 2, 0, 0]),
  );
  add(new THREE.CylinderGeometry(0.045, 0.045, 0.022, 6), M.chrome, [0.22, HB + 0.18, BZ - 0.02], [Math.PI / 2, 0, 0]);
  add(new THREE.CylinderGeometry(0.024, 0.024, 0.024, 24), M.plastic, [0.22, HB + 0.18, BZ - 0.025], [Math.PI / 2, 0, 0]);
  add(
    new THREE.CylinderGeometry(0.013, 0.013, 0.026, 16),
    new THREE.MeshStandardMaterial({ color: 0x020203, metalness: 0.3, roughness: 0.7 }),
    [0.22, HB + 0.18, BZ - 0.028],
    [Math.PI / 2, 0, 0],
  );

  // Two white ceramic espresso cups on the drip-tray grate, flanking
  // centre ("due tazze bianche ai lati"). Dedicated white material (not
  // M.body) so they stay white through the Smeg colour switcher.
  const ceramic = new THREE.MeshStandardMaterial({
    color: 0xf1efe9,
    metalness: 0.0,
    roughness: 0.32,
    envMapIntensity: 0.6,
  });
  // Stackable espresso cup (per the reference): rounded narrow base →
  // step → wider upper cylinder → rim, hollow interior. White ceramic.
  const cupProfile: [number, number][] = [
    [0.0, 0.0], [0.085, 0.0], [0.092, 0.022], [0.105, 0.05],
    [0.135, 0.115], [0.128, 0.155], [0.118, 0.182], [0.178, 0.205],
    [0.197, 0.3], [0.204, 0.43], [0.206, 0.46], [0.19, 0.452],
    [0.178, 0.34], [0.158, 0.21], [0.1, 0.085], [0.0, 0.1],
  ];
  const cupGeo = new THREE.LatheGeometry(
    cupProfile.map(([r, y]) => new THREE.Vector2(r, y)),
    64,
  );
  // Colour band — material is M.body, so the build-time smegBody tagging
  // below recolours it with the machine: green machine → green cups.
  const cupBandGeo = new THREE.CylinderGeometry(0.206, 0.206, 0.19, 48, 1, true);
  // "AURELIA" wordmark on a transparent canvas → a curved decal that
  // stays white over the colour band (separate mesh, NOT M.body, so the
  // Smeg switcher never recolours the text).
  const logoC = document.createElement("canvas");
  logoC.width = 512;
  logoC.height = 128;
  const lx = logoC.getContext("2d")!;
  lx.clearRect(0, 0, 512, 128);
  lx.fillStyle = "#ffffff";
  lx.font = "600 66px Georgia, 'Times New Roman', serif";
  lx.textAlign = "center";
  lx.textBaseline = "middle";
  lx.fillText("A U R E L I A", 256, 70);
  const cupLogoTex = new THREE.CanvasTexture(logoC);
  cupLogoTex.colorSpace = THREE.SRGBColorSpace;
  // Read left-to-right on the cup exterior (no repeat/offset mirror).
  const cupLogoMat = new THREE.MeshStandardMaterial({
    map: cupLogoTex,
    transparent: true,
    metalness: 0,
    roughness: 0.45,
  });
  // Arc centred on +Z (front, toward the viewer): THREE cylinder theta=0
  // is +Z, so thetaStart -arc/2 centres it.
  const cupLogoGeo = new THREE.CylinderGeometry(
    0.209, 0.209, 0.085, 48, 1, true, -0.62, 1.24,
  );
  const trayTopY = GRATE_Y + 0.016;
  ([-1, 1] as const).forEach((sx) => {
    const cup = new THREE.Group();
    const body = new THREE.Mesh(cupGeo, ceramic);
    body.castShadow = body.receiveShadow = true;
    cup.add(body);
    const band = new THREE.Mesh(cupBandGeo, M.body);
    band.position.y = 0.305;
    cup.add(band);
    const logo = new THREE.Mesh(cupLogoGeo, cupLogoMat);
    logo.position.y = 0.315;
    if (sx < 0) logo.rotation.y = Math.PI; // keep "AURELIA" facing front
    cup.add(logo);
    // Deterministic C-handle: a tube along a curve embedded into the cup
    // wall top and bottom (white ceramic, like the reference handle).
    const handleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.19, 0.4, 0),
      new THREE.Vector3(0.285, 0.385, 0),
      new THREE.Vector3(0.31, 0.305, 0),
      new THREE.Vector3(0.285, 0.225, 0),
      new THREE.Vector3(0.19, 0.215, 0),
    ]);
    const handle = new THREE.Mesh(
      new THREE.TubeGeometry(handleCurve, 28, 0.016, 12, false),
      ceramic,
    );
    handle.castShadow = true;
    cup.add(handle);
    if (sx < 0) cup.rotation.y = Math.PI;
    cup.position.set(sx * 0.25, trayTopY, GRATE_Z + 0.04);
    m.add(cup);
  });

  // Center on X/Z, base to Y=0.
  const bbox = new THREE.Box3().setFromObject(m);
  const center = bbox.getCenter(new THREE.Vector3());
  m.position.x -= center.x;
  m.position.z -= center.z;
  m.position.y -= bbox.min.y;

  // ── Smeg variant hooks ──────────────────────────────────────────────
  // Tag every mesh using the shared `M.body` shell material so
  // applyVariant() retargets JUST the coloured shell. `M.bodyDark`
  // recesses + chrome/copper accents stay as-is — real Smeg machines
  // read with dark/chrome trim, so this is correct, not a shortcut.
  // Stash the body PBR maps on the group: the matte finish reuses these
  // already-uploaded textures → ZERO extra VRAM on a colour switch
  // (kiosk GPU budget — see project memory).
  m.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && mesh.material === M.body) {
      mesh.userData.smegBody = true;
    }
  });
  m.userData.smegBodyMaps = {
    normal: setBody.normal,
    roughness: setBody.roughness,
  };

  return m;
}

// ── Runtime Smeg colour (glossy enamel only) ────────────────────────────
//
// applyVariant() recolours the machine WITHOUT rebuilding it.
// buildEspressoMachine() synthesises ~20 canvas textures; re-running it on
// every switch would spike GPU allocation → context loss → white screen on
// the kiosk iGPU. Instead we keep ONE shared glossy material (created
// lazily, reused forever) and just retarget the tagged shell meshes + set
// `.color`. No per-switch allocation.

let _glossyBody: THREE.MeshPhysicalMaterial | null = null;

function glossyBody(): THREE.MeshPhysicalMaterial {
  if (_glossyBody) return _glossyBody;
  // Pastello/Classica enamel: dielectric + clearcoat = the "smaltato /
  // porcellanato" sheet-metal look. ANTI-FRY (#1 offender — biggest
  // moving glossy surface): clearcoatRoughness 0.03→0.13 + roughness
  // 0.045→0.11 + envMapIntensity 1.0→0.85. The razor clearcoat lobe was
  // crawling sub-pixel under auto-rotation with only SMAA on the weak
  // iGPU; a wider lobe + dimmer env kills the boil, still reads enamel.
  _glossyBody = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0.11,
    clearcoat: 1.0,
    clearcoatRoughness: 0.13,
    envMapIntensity: 0.85,
  });
  return _glossyBody;
}

/**
 * Recolour the machine shell in place. Idempotent and allocation-free
 * after the first call — safe to call synchronously during the build (so
 * the first paint is already the chosen colour, no anthracite flash) and
 * again on every colour change.
 */
export function applyVariant(group: THREE.Group, colorId: SmegColorId): void {
  const mat = glossyBody();
  mat.color.set(getSmegColor(colorId).hex);
  mat.needsUpdate = true;
  group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && mesh.userData.smegBody) {
      mesh.material = mat;
    }
  });
}

/**
 * Kiosk iGPU white-screen guardrail (project memory: "WebGL GPU budget
 * ceiling"). One-way, in-place, allocation-free emergency degrade: on
 * `webglcontextlost` we drop the expensive clearcoat pass and raise
 * roughness on the single shared body material. NOT a user-facing matte —
 * there is no matte option — just survival so the restored context renders
 * the lighter shader. Stays degraded across colour changes (applyVariant
 * only touches `.color`); the visitor keeps their colour, loses the gloss.
 */
export function applyEmergencyDegrade(): void {
  if (!_glossyBody) return;
  _glossyBody.clearcoat = 0;
  _glossyBody.clearcoatRoughness = 1;
  _glossyBody.roughness = 0.5;
  _glossyBody.envMapIntensity = 0.4;
  _glossyBody.needsUpdate = true;
}
