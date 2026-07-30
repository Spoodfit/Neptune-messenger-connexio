import { ok } from "node:assert";
import test from "node:test";

import { colors } from "../src/theme";

function channel(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const red = channel(Number.parseInt(value.slice(0, 2), 16));
  const green = channel(Number.parseInt(value.slice(2, 4), 16));
  const blue = channel(Number.parseInt(value.slice(4, 6), 16));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground: string, background: string): number {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const normalTextPairs: Array<[string, string, string]> = [
  ["primary sur blanc", colors.primary, colors.white],
  ["texte clair sur fond primaire doux", colors.text, colors.primarySoft],
  ["texte atténué sur surface", colors.textMuted, colors.surface],
  ["texte atténué sur fond", colors.textMuted, colors.background],
  ["texte atténué sur surface douce", colors.textMuted, colors.surfaceMuted],
  ["succès sur fond succès", colors.success, colors.successSoft],
  ["avertissement sur fond avertissement", colors.warning, colors.warningSoft],
  ["erreur sur fond erreur", colors.danger, colors.dangerSoft],
  ["blanc sur bleu primaire", colors.white, colors.primary],
  ["blanc sur bleu nuit", colors.white, colors.navy],
  ["blanc sur magenta du gradient", colors.white, colors.magenta]
];

test("les couleurs de texte principales respectent WCAG AA", () => {
  for (const [label, foreground, background] of normalTextPairs) {
    const ratio = contrast(foreground, background);
    ok(ratio >= 4.5, `${label}: contraste ${ratio.toFixed(2)} inférieur à 4.5`);
  }
});
