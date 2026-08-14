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

/*
 * Le mode clair est volontairement une gamme "brume marine", pas un thème blanc.
 * Les surfaces sont séparées par luminance ET par bordure afin de rester lisibles
 * sur les écrans Android très lumineux. Les couleurs d'état utilisent des fonds
 * teintés opaques plutôt que de faibles transparences qui disparaissent au soleil.
 */
export const lightSemanticPalette: ConnexioSemanticPalette = {
  background: "#EAF0F7",
  raised: "#F8FAFD",
  surface: "#F3F7FB",
  surfaceStrong: "#E4ECF6",
  surfaceMuted: "#D7E2EF",
  gradient: ["#F5F8FC", "#E8EFF7"],
  text: "#09172F",
  textSecondary: "#293D59",
  textMuted: "#5A6D86",
  border: "rgba(17,45,82,0.23)",
  borderSoft: "rgba(17,45,82,0.13)",
  input: "#F9FBFD",
  chip: "#E3ECF6",
  shell: "rgba(244,248,252,0.985)",
  nav: "rgba(238,244,250,0.99)",
  navInactive: "#60738C",
  overlay: "rgba(8,22,45,0.42)",
  accent: "#0A58C4",
  accentSoft: "#DCE9FB",
  violet: "#6243C7",
  violetSoft: "#E8E2F8",
  orange: "#92501F",
  orangeSoft: "#F5E4D6",
  success: "#087157",
  successSoft: "#D8EFE7",
  warning: "#805400",
  warningSoft: "#F5E9C8",
  danger: "#AB3043",
  dangerSoft: "#F4DDE2",
  shadow: "#223D5A"
};
