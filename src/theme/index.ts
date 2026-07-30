export const colors = {
  navy: "#020713",
  navyLight: "#071127",
  primary: "#0048BA",
  primaryDark: "#00378E",
  primarySoft: "#102A54",
  violet: "#6B4FEA",
  magenta: "#A950D8",
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
} as const;

export const gradients = {
  primary: [colors.primary, colors.violet, colors.magenta] as const,
  primaryWarm: [colors.primary, colors.violet, colors.orange] as const,
  screen: [colors.backgroundRaised, colors.background] as const,
  glass: ["rgba(255,255,255,0.075)", "rgba(255,255,255,0.035)"] as const,
  activeTab: ["rgba(0,72,186,0.42)", "rgba(107,79,234,0.38)"] as const
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  xxl: 30,
  pill: 999
} as const;

export const typography = {
  display: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900" as const
  },
  heading2: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800" as const
  },
  heading3: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800" as const
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "400" as const
  },
  bodySmall: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400" as const
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const
  }
} as const;
