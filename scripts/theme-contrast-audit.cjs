const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(process.cwd(), "src/theme/semanticPalette.ts"), "utf8");
const block = source.match(/export const lightSemanticPalette:[\s\S]*?=\s*\{([\s\S]*?)\n\};/);
if (!block) throw new Error("lightSemanticPalette introuvable.");

const palette = {};
for (const match of block[1].matchAll(/^\s{2}([A-Za-z0-9_]+):\s*"([^"]+)"/gm)) palette[match[1]] = match[2];

function parseColor(value, backdrop = [255, 255, 255]) {
  if (!value) throw new Error("Couleur absente.");
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    const normalized = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
    return [0, 2, 4].map((index) => parseInt(normalized.slice(index, index + 2), 16));
  }
  const rgba = value.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)$/);
  if (!rgba) throw new Error(`Format couleur non pris en charge: ${value}`);
  const rgb = [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])];
  const alpha = rgba[4] === undefined ? 1 : Number(rgba[4]);
  return rgb.map((channel, index) => Math.round(channel * alpha + backdrop[index] * (1 - alpha)));
}

function luminance(rgb) {
  const channels = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function ratio(foreground, background) {
  const bg = parseColor(background);
  const fg = parseColor(foreground, bg);
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const requiredTokens = [
  "background", "raised", "surface", "surfaceStrong", "surfaceMuted",
  "text", "textSecondary", "textMuted", "navInactive", "accent", "accentSoft",
  "violet", "violetSoft", "orange", "orangeSoft", "success", "successSoft",
  "warning", "warningSoft", "danger", "dangerSoft"
];
for (const token of requiredTokens) {
  if (!palette[token]) throw new Error(`Token light manquant: ${token}`);
}

const checks = [
  ["texte/page", "text", "background", 7],
  ["texte/surface", "text", "surface", 7],
  ["texte secondaire/surface", "textSecondary", "surface", 4.5],
  ["texte secondaire/surface forte", "textSecondary", "surfaceStrong", 4.5],
  ["texte atténué/surface", "textMuted", "surface", 4.5],
  ["navigation inactive/fond relevé", "navInactive", "raised", 4.5],
  ["accent/fond accent", "accent", "accentSoft", 4.5],
  ["violet/fond violet", "violet", "violetSoft", 4.5],
  ["orange/fond orange", "orange", "orangeSoft", 4.5],
  ["succès/fond succès", "success", "successSoft", 4.5],
  ["alerte/fond alerte", "warning", "warningSoft", 4.5],
  ["danger/fond danger", "danger", "dangerSoft", 4.5]
];

const failures = [];
for (const [label, fgToken, bgToken, minimum] of checks) {
  const contrast = ratio(palette[fgToken], palette[bgToken]);
  const printable = contrast.toFixed(2);
  console.log(`${label}: ${printable}:1 (minimum ${minimum}:1)`);
  if (contrast < minimum) failures.push(`${label}: ${printable}:1 < ${minimum}:1`);
}

const surfaceDistances = [
  ["background", "surface"],
  ["surface", "surfaceStrong"],
  ["surfaceStrong", "surfaceMuted"]
];
function channelDistance(a, b) {
  const ca = parseColor(a);
  const cb = parseColor(b);
  return Math.sqrt(ca.reduce((sum, value, index) => sum + Math.pow(value - cb[index], 2), 0));
}
for (const [a, b] of surfaceDistances) {
  const distance = channelDistance(palette[a], palette[b]);
  console.log(`séparation ${a}/${b}: ${distance.toFixed(1)}`);
  if (distance < 10) failures.push(`Surfaces trop proches: ${a}/${b} (${distance.toFixed(1)})`);
}

if (failures.length) {
  console.error("\nAudit contraste light échoué:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log("Palette light: contrastes et séparation des surfaces validés.");
