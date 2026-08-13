import { StyleSheet } from "react-native";
import { colors } from "../theme";

export const pollStyles = StyleSheet.create({
  card: { width: "100%", maxWidth: 420, gap: 9 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  icon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(244,177,131,0.14)" },
  titleContent: { flex: 1, minWidth: 0 },
  question: { color: colors.text, fontSize: 14, lineHeight: 17, fontWeight: "900" },
  meta: { color: colors.textMuted, fontSize: 11, lineHeight: 13, marginTop: 3, fontWeight: "700" },
  options: { gap: 8 },
  option: { minHeight: 48, overflow: "hidden", paddingHorizontal: 8, paddingVertical: 7, borderRadius: 14, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: "rgba(2,7,19,0.22)", justifyContent: "center", gap: 8 },
  optionActive: { borderColor: colors.violet },
  progress: { position: "absolute", top: 0, bottom: 0, left: 0, backgroundColor: "rgba(107,79,234,0.18)" },
  optionMain: { flexDirection: "row", alignItems: "center", gap: 8 },
  choice: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceStrong, alignItems: "center", justifyContent: "center" },
  choiceMultiple: { borderRadius: 7 },
  optionLabel: { flex: 1, color: colors.textSecondary, fontSize: 11, lineHeight: 15, fontWeight: "800" },
  optionCount: { color: colors.text, fontSize: 11, fontWeight: "900" },
  voterLine: { minHeight: 20, flexDirection: "row", justifyContent: "flex-end" },
  voters: { flexDirection: "row", alignItems: "center" },
  remaining: { width: 20, height: 20, marginLeft: -7, borderRadius: 8, borderWidth: 1.5, borderColor: colors.navyLight, backgroundColor: colors.surfaceStrong, alignItems: "center", justifyContent: "center" },
  remainingText: { color: colors.textSecondary, fontSize: 11, fontWeight: "900" },
  footer: { minHeight: 30, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 },
  footerText: { flex: 1, minWidth: 90, color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  eventLink: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8 },
  eventLinkText: { color: colors.orange, fontSize: 11, fontWeight: "900" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.993 }] },
  busy: { opacity: 0.72 }
});
