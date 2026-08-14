export interface ConnexioSemanticPalette {
  background: string;
  raised: string;
  surface: string;
  surfaceStrong: string;
  surfaceMuted: string;
  gradient: readonly [string, string];
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderSoft: string;
  input: string;
  chip: string;
  shell: string;
  nav: string;
  navInactive: string;
  overlay: string;
  accent: string;
  accentSoft: string;
  violet: string;
  violetSoft: string;
  orange: string;
  orangeSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  shadow: string;
}

export const darkSemanticPalette: ConnexioSemanticPalette = {
  background: "#020713",
  raised: "#050B1C",
  surface: "#081226",
  surfaceStrong: "#101A31",
  surfaceMuted: "#111C34",
  gradient: ["#050B1C", "#020713"],
  text: "#F4F7FF",
  textSecondary: "#D2DBEF",
  textMuted: "#AEB8D2",
  border: "rgba(255,255,255,0.14)",
  borderSoft: "rgba(255,255,255,0.085)",
  input: "#0B1630",
  chip: "#101C36",
  shell: "rgba(8,18,38,0.98)",
  nav: "rgba(8,18,38,0.98)",
  navInactive: "#7F8DAB",
  overlay: "rgba(0,0,0,0.68)",
  accent: "#0048BA",
  accentSoft: "#102A54",
  violet: "#806CF2",
  violetSoft: "#221A4A",
  orange: "#F4B183",
  orangeSoft: "#392719",
  success: "#38F8B4",
  successSoft: "#0A3029",
  warning: "#F4B183",
  warningSoft: "#392719",
  danger: "#FF7B86",
  dangerSoft: "#35151E",
  shadow: "#000000"
};

export const lightSemanticPalette: ConnexioSemanticPalette = {
  background: "#F6F8FC",
  raised: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceStrong: "#EEF3FA",
  surfaceMuted: "#E7EDF6",
  gradient: ["#FFFFFF", "#F3F6FB"],
  text: "#07152E",
  textSecondary: "#2B3B56",
  textMuted: "#5D6B82",
  border: "rgba(7,21,46,0.18)",
  borderSoft: "rgba(7,21,46,0.10)",
  input: "#FFFFFF",
  chip: "#EEF3FA",
  shell: "rgba(255,255,255,0.98)",
  nav: "rgba(255,255,255,0.99)",
  navInactive: "#5D6B82",
  overlay: "rgba(7,21,46,0.38)",
  accent: "#0048BA",
  accentSoft: "#E9F0FF",
  violet: "#5B3FD6",
  violetSoft: "#EFEAFF",
  orange: "#9A4E15",
  orangeSoft: "#FFF0E4",
  success: "#087452",
  successSoft: "#E3F7EF",
  warning: "#8A5600",
  warningSoft: "#FFF4D6",
  danger: "#B42335",
  dangerSoft: "#FDECEF",
  shadow: "#17345B"
};
