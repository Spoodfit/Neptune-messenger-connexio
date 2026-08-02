"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typography = exports.radii = exports.spacing = exports.gradients = exports.colors = void 0;
exports.colors = {
    transparent: "transparent",
    navy: "#020713",
    navyLight: "#071127",
    primary: "#0048BA",
    primaryDark: "#00378E",
    primarySoft: "#102A54",
    violet: "#6B4FEA",
    magenta: "#A044C8",
    orange: "#F4B183",
    background: "#020713",
    backgroundRaised: "#050B1C",
    surface: "#081226",
    surfaceStrong: "#101A31",
    surfaceMuted: "#111C34",
    glass: "rgba(255,255,255,0.065)",
    glassStrong: "rgba(255,255,255,0.095)",
    border: "rgba(255,255,255,0.14)",
    borderSoft: "rgba(255,255,255,0.085)",
    text: "#F4F7FF",
    textSecondary: "#D2DBEF",
    textMuted: "#AEB8D2",
    white: "#FFFFFF",
    whiteMuted: "rgba(255,255,255,0.78)",
    success: "#38F8B4",
    successSoft: "#0A3029",
    warning: "#F4B183",
    warningSoft: "#392719",
    danger: "#FF7B86",
    dangerSoft: "#35151E",
    shadow: "rgba(0,0,0,0.42)"
};
exports.gradients = {
    primary: [exports.colors.primary, exports.colors.violet, exports.colors.magenta],
    primaryWarm: [exports.colors.primary, exports.colors.violet, exports.colors.orange],
    screen: [exports.colors.backgroundRaised, exports.colors.background],
    glass: ["rgba(255,255,255,0.075)", "rgba(255,255,255,0.035)"],
    activeTab: ["rgba(0,72,186,0.42)", "rgba(107,79,234,0.38)"]
};
exports.spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
};
exports.radii = {
    sm: 8,
    md: 12,
    lg: 18,
    xl: 24,
    xxl: 30,
    pill: 999
};
exports.typography = {
    display: {
        fontSize: 30,
        lineHeight: 36,
        fontWeight: "900"
    },
    heading2: {
        fontSize: 20,
        lineHeight: 26,
        fontWeight: "800"
    },
    heading3: {
        fontSize: 16,
        lineHeight: 21,
        fontWeight: "800"
    },
    body: {
        fontSize: 15,
        lineHeight: 21,
        fontWeight: "400"
    },
    bodySmall: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: "400"
    },
    caption: {
        fontSize: 12,
        lineHeight: 16,
        fontWeight: "500"
    }
};
