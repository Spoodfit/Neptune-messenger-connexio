export const colors = {
  navy: "#07162F",
  navyLight: "#102A54",
  primary: "#4658EB",
  primaryDark: "#3040C7",
  primarySoft: "#ECEEFF",
  violet: "#7B3FF2",
  magenta: "#A83BCE",
  orange: "#FF7A45",
  background: "#F5F7FC",
  surface: "#FFFFFF",
  surfaceMuted: "#EEF1F7",
  border: "#E0E5EF",
  text: "#10213D",
  textSecondary: "#40516D",
  textMuted: "#606C82",
  white: "#FFFFFF",
  whiteMuted: "rgba(255,255,255,0.72)",
  success: "#11754C",
  successSoft: "#E1F7EE",
  warning: "#955308",
  warningSoft: "#FFF1D6",
  danger: "#B52F3E",
  dangerSoft: "#FFE6E9"
} as const;

export const gradients = {
  primary: [colors.primary, colors.violet, colors.magenta] as const
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
