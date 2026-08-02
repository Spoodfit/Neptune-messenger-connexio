"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const node_test_1 = __importDefault(require("node:test"));
const theme_1 = require("../src/theme");
function channel(value) {
    const normalized = value / 255;
    return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
}
function luminance(hex) {
    const value = hex.replace("#", "");
    const red = channel(Number.parseInt(value.slice(0, 2), 16));
    const green = channel(Number.parseInt(value.slice(2, 4), 16));
    const blue = channel(Number.parseInt(value.slice(4, 6), 16));
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
function contrast(foreground, background) {
    const first = luminance(foreground);
    const second = luminance(background);
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
const normalTextPairs = [
    ["primary sur blanc", theme_1.colors.primary, theme_1.colors.white],
    ["texte clair sur fond primaire doux", theme_1.colors.text, theme_1.colors.primarySoft],
    ["texte atténué sur surface", theme_1.colors.textMuted, theme_1.colors.surface],
    ["texte atténué sur fond", theme_1.colors.textMuted, theme_1.colors.background],
    ["texte atténué sur surface douce", theme_1.colors.textMuted, theme_1.colors.surfaceMuted],
    ["succès sur fond succès", theme_1.colors.success, theme_1.colors.successSoft],
    ["avertissement sur fond avertissement", theme_1.colors.warning, theme_1.colors.warningSoft],
    ["erreur sur fond erreur", theme_1.colors.danger, theme_1.colors.dangerSoft],
    ["blanc sur bleu primaire", theme_1.colors.white, theme_1.colors.primary],
    ["blanc sur bleu nuit", theme_1.colors.white, theme_1.colors.navy],
    ["blanc sur magenta du gradient", theme_1.colors.white, theme_1.colors.magenta]
];
(0, node_test_1.default)("les couleurs de texte principales respectent WCAG AA", () => {
    for (const [label, foreground, background] of normalTextPairs) {
        const ratio = contrast(foreground, background);
        (0, node_assert_1.ok)(ratio >= 4.5, `${label}: contraste ${ratio.toFixed(2)} inférieur à 4.5`);
    }
});
