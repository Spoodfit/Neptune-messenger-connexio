const fs = require("node:fs");

function patch(path, from, to) {
  const source = fs.readFileSync(path, "utf8");
  if (!source.includes(from)) throw new Error(`Expected source not found in ${path}: ${from.slice(0, 120)}`);
  fs.writeFileSync(path, source.replace(from, to));
}

function overwrite(path, content) {
  fs.writeFileSync(path, content);
}

// Scheduled calls keep their already-entered subject when joined.
patch(
  "app/(tabs)/calls.tsx",
  'const startCall = async (memberId: string, mode: "audio" | "video", reason?: string) => {\n    if (openingMemberId) return;\n    setOpeningMemberId(memberId);\n    try { const conversation = await ensureConversation(memberId); router.push({ pathname: "/call/[id]", params: { id: conversation.id, mode, ...(reason ? { reason } : {}) } }); }\n    finally { setOpeningMemberId(null); }\n  };',
  'const startCall = async (memberId: string, mode: "audio" | "video", reason?: string, scheduled = false) => {\n    if (openingMemberId) return;\n    setOpeningMemberId(memberId);\n    try { const conversation = await ensureConversation(memberId); router.push({ pathname: "/call/[id]", params: { id: conversation.id, mode, ...(reason ? { reason } : {}), ...(scheduled ? { scheduled: "1" } : {}) } }); }\n    finally { setOpeningMemberId(null); }\n  };'
);
patch(
  "app/(tabs)/calls.tsx",
  'onPress={() => void startCall(member.id, call.mode, call.subject)} style={styles.appointmentPrimary}><Ionicons name={call.mode === "audio" ? "call" : "videocam"} size={18} color={colors.white} /><Text style={styles.appointmentPrimaryText}>Appeler maintenant</Text>',
  'onPress={() => void startCall(member.id, call.mode, call.subject, true)} style={styles.appointmentPrimary}><Ionicons name={call.mode === "audio" ? "call" : "videocam"} size={18} color={colors.white} /><Text style={styles.appointmentPrimaryText}>Rejoindre le rendez-vous</Text>'
);
patch(
  "app/(tabs)/calls.tsx",
  'sectionHead: { minHeight: 44, paddingHorizontal: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }',
  'sectionHead: { minHeight: 44, paddingHorizontal: 4, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", columnGap: 8, rowGap: 10 }'
);
patch(
  "app/(tabs)/calls.tsx",
  'newAppointment: { minHeight: 48, paddingHorizontal: 12, borderRadius: 15, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", gap: 5 }',
  'newAppointment: { minHeight: 48, paddingHorizontal: 12, marginLeft: "auto", borderRadius: 15, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", gap: 5 }'
);
patch(
  "app/(tabs)/calls.tsx",
  '<View style={styles.searchShell}><Ionicons name="search" size={21} color={colors.textMuted} /><TextInput value={query} onChangeText={setQuery} placeholder="Nom, entreprise, ville…" placeholderTextColor={colors.textMuted} accessibilityLabel="Rechercher une personne à appeler" autoCapitalize="none" autoCorrect={false} style={styles.searchInput} />',
  '<View style={[styles.searchShell, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}><Ionicons name="search" size={21} color={theme.pageTextMuted} /><TextInput value={query} onChangeText={setQuery} placeholder="Nom, entreprise, ville…" placeholderTextColor={theme.pageTextMuted} accessibilityLabel="Rechercher une personne à appeler" autoCapitalize="none" autoCorrect={false} style={[styles.searchInput, { color: theme.pageText }]} />'
);
patch(
  "app/(tabs)/calls.tsx",
  'style={styles.utilityButton}><Ionicons name="person-add-outline" size={19} color={colors.violet}',
  'style={[styles.utilityButton, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}><Ionicons name="person-add-outline" size={19} color={theme.violet}'
);
patch(
  "app/(tabs)/calls.tsx",
  'style={styles.frequentCard}><Pressable',
  'style={[styles.frequentCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}><Pressable'
);
patch(
  "app/(tabs)/calls.tsx",
  'return <View key={call.id} style={[styles.appointmentCard, accepted && styles.appointmentAccepted]}>',
  'return <View key={call.id} style={[styles.appointmentCard, { backgroundColor: theme.surface, borderColor: accepted ? theme.success : theme.orange }]}> '
);

patch(
  "app/call/[id].tsx",
  '    reason?: string;\n  }>();',
  '    reason?: string;\n    scheduled?: string;\n  }>();'
);
patch(
  "app/call/[id].tsx",
  '  const initialReason = first(params.reason) ?? "";\n  const conversation = getConversation(conversationId);',
  '  const initialReason = first(params.reason) ?? "";\n  const scheduled = first(params.scheduled) === "1" && initialReason.trim().length >= 3;\n  const conversation = getConversation(conversationId);'
);
patch(
  "app/call/[id].tsx",
  '      title="Pourquoi appelez-vous ?"\n      description="Une phrase suffit. Elle s’affichera avant que le destinataire décroche."\n    >\n      <View style={styles.reasonEditor}>\n        <Text style={styles.label}>Objet de l’appel</Text>\n        <VoicePromptInput\n          value={reason}\n          onChangeText={setReason}\n          onSubmit={() => void startOutgoingCall()}\n          placeholder="Ex. Valider le lieu de l’afterwork de vendredi"\n          maxLength={160}\n        />\n        <Text style={styles.counter}>{reason.length}/160</Text>\n      </View>',
  '      title={scheduled ? "Rendez-vous programmé" : "Pourquoi appelez-vous ?"}\n      description={scheduled ? "L’objet a déjà été défini lors de la programmation. Vous pouvez rejoindre directement l’appel." : "Une phrase suffit. Elle s’affichera avant que le destinataire décroche."}\n    >\n      {scheduled ? <ReasonCard value={initialReason} /> : <View style={styles.reasonEditor}>\n        <Text style={styles.label}>Objet de l’appel</Text>\n        <VoicePromptInput\n          value={reason}\n          onChangeText={setReason}\n          onSubmit={() => void startOutgoingCall()}\n          placeholder="Ex. Valider le lieu de l’afterwork de vendredi"\n          maxLength={160}\n        />\n        <Text style={styles.counter}>{reason.length}/160</Text>\n      </View>}'
);
patch(
  "app/call/[id].tsx",
  '        label={preparing ? "Préparation…" : "Lancer l’appel"}',
  '        label={preparing ? "Préparation…" : scheduled ? "Rejoindre le rendez-vous" : "Lancer l’appel"}'
);

// Reserve room below role badges and remove duplicate profile badge above online state.
patch(
  "src/components/StatusAvatar.tsx",
  '      style={[styles.stage, overlap && styles.overlap]}',
  '      style={[styles.stage, overlap && styles.overlap, showBadge && styles.withBadgeSpace]}'
);
patch(
  "src/components/StatusAvatar.tsx",
  '  overlap: { marginHorizontal: -2 },',
  '  overlap: { marginHorizontal: -2 },\n  withBadgeSpace: { marginBottom: 14 },'
);
patch(
  "app/profile/[id].tsx",
  'import { StatusAvatar } from "@/components/StatusAvatar";',
  'import { StatusAvatar } from "@/components/StatusAvatar";\nimport { ThemeModeButton } from "@/components/ThemeModeButton";'
);
patch(
  "app/profile/[id].tsx",
  '<Pressable accessibilityLabel="Retour" onPress={() => router.back()} style={styles.headerButton}><Ionicons name="chevron-back" size={25} color={theme.pageText} /></Pressable><Text style={[styles.headerTitle, heading]}>Profil membre</Text><Pressable accessibilityLabel="Plus d’options" onPress={() => setMenuOpen(true)} style={styles.headerButton}><Ionicons name="ellipsis-horizontal" size={23} color={theme.pageText} /></Pressable>',
  '<Pressable accessibilityLabel="Retour" onPress={() => router.back()} style={styles.headerButton}><Ionicons name="chevron-back" size={25} color={theme.pageText} /></Pressable><Text style={[styles.headerTitle, heading]}>Profil membre</Text><View style={styles.headerActions}><ThemeModeButton /><Pressable accessibilityLabel="Plus d’options" onPress={() => setMenuOpen(true)} style={styles.headerButton}><Ionicons name="ellipsis-horizontal" size={23} color={theme.pageText} /></Pressable></View>'
);
patch(
  "app/profile/[id].tsx",
  '<View style={styles.identity}><StatusAvatar user={member} size={104} showBadge />',
  '<View style={styles.identity}><StatusAvatar user={member} size={104} />'
);
patch(
  "app/profile/[id].tsx",
  'Choisir une personne de votre téléphone et partager uniquement ses coordonnées sélectionnées.',
  'Choisir un membre Connexio ou, si besoin, un contact du téléphone.'
);
patch(
  "app/profile/[id].tsx",
  'headerButton: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" }, headerTitle:',
  'headerButton: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" }, headerActions: { flexDirection: "row", alignItems: "center", gap: 2 }, headerTitle:'
);
patch(
  "app/profile/[id].tsx",
  'style={styles.recommendAction}><Ionicons name="people-outline" size={20} color={colors.violet}',
  'style={[styles.recommendAction, { backgroundColor: theme.violetSoft, borderColor: theme.violet }]}><Ionicons name="people-outline" size={20} color={theme.violet}'
);
patch(
  "app/profile/[id].tsx",
  'style={({ pressed }) => [styles.businessCard, pressed && styles.pressed]}',
  'style={({ pressed }) => [styles.businessCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }, pressed && styles.pressed]}'
);
patch(
  "app/profile/[id].tsx",
  'style={({ pressed }) => [styles.postCard, pressed && styles.pressed]}',
  'style={({ pressed }) => [styles.postCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }, pressed && styles.pressed]}'
);

// Quick actions around + keep a real gap even on 280dp layouts.
patch(
  "src/components/NeptuneTabBar.tsx",
  'quickAction: { position: "absolute", top: 0, zIndex: 1010, width: 132, height: 56',
  'quickAction: { position: "absolute", top: 0, zIndex: 1010, width: 124, height: 56'
);
patch(
  "src/components/NeptuneTabBar.tsx",
  'quickMessage: { left: "50%", marginLeft: -130 }, quickHighlight: { left: "50%", marginLeft: -2 }',
  'quickMessage: { left: "50%", marginLeft: -128 }, quickHighlight: { left: "50%", marginLeft: 4 }'
);

// Main message screen surfaces must not stay dark in Light mode.
patch(
  "app/(tabs)/messages.tsx",
  '<View style={styles.toolbar}><View accessibilityRole="tablist" style={styles.segmented}>',
  '<View style={styles.toolbar}><View accessibilityRole="tablist" style={[styles.segmented, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>'
);
patch(
  "app/(tabs)/messages.tsx",
  '<Pressable style={styles.sheet} onPress={() => undefined}>',
  '<Pressable style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => undefined}>'
);
patch(
  "app/(tabs)/messages.tsx",
  '<Text style={styles.sheetTitle}>{selectedConversation?.name}</Text><Text style={styles.sheetSubtitle}>',
  '<Text style={[styles.sheetTitle, { color: theme.pageText }]}>{selectedConversation?.name}</Text><Text style={[styles.sheetSubtitle, { color: theme.pageTextMuted }]}>'
);
patch(
  "app/(tabs)/messages.tsx",
  '<Ionicons name={selectedConversation?.muted ? "notifications" : "notifications-off"} size={21} color={colors.text} /><Text style={styles.sheetActionText}>',
  '<Ionicons name={selectedConversation?.muted ? "notifications" : "notifications-off"} size={21} color={theme.pageText} /><Text style={[styles.sheetActionText, { color: theme.pageText }]}>'
);
patch(
  "app/(tabs)/messages.tsx",
  '<Ionicons name="settings-outline" size={21} color={colors.text} /><Text style={styles.sheetActionText}>',
  '<Ionicons name="settings-outline" size={21} color={theme.pageText} /><Text style={[styles.sheetActionText, { color: theme.pageText }]}>'
);

// Settings/profile tab: remove dark-only card surfaces.
patch(
  "app/(tabs)/settings.tsx",
  '<LinearGradient colors={gradients.glass} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.hero}>',
  '<LinearGradient colors={theme.isLight ? [theme.surface, theme.surfaceStrong] : gradients.glass} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={[styles.hero, { borderColor: theme.borderSoft }]}>'
);
patch(
  "app/(tabs)/settings.tsx",
  '<Text style={styles.name}>{currentUser.name}</Text>\n            <Text style={styles.company}>',
  '<Text style={[styles.name, { color: theme.pageText }]}>{currentUser.name}</Text>\n            <Text style={[styles.company, { color: theme.pageTextSecondary }]}>'
);
patch(
  "app/(tabs)/settings.tsx",
  'style={({ pressed }) => [styles.businessCard, pressed && styles.pressed]}',
  'style={({ pressed }) => [styles.businessCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }, pressed && styles.pressed]}'
);
patch(
  "app/(tabs)/settings.tsx",
  'style={({ pressed }) => [styles.postCard, pressed && styles.pressed]}',
  'style={({ pressed }) => [styles.postCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }, pressed && styles.pressed]}'
);
patch(
  "app/(tabs)/settings.tsx",
  'style={({ pressed }) => [styles.row, pressed && styles.pressed]}',
  'style={({ pressed }) => [styles.row, { backgroundColor: theme.surface, borderColor: theme.borderSoft }, pressed && styles.pressed]}'
);

// Regression-test the semantic light palette against WCAG AA for normal text.
overwrite("tests/contrast.test.ts", `import { ok } from "node:assert";\nimport test from "node:test";\n\nimport { colors } from "../src/theme";\nimport { lightSemanticPalette } from "../src/theme/semanticPalette";\n\nfunction channel(value: number): number {\n  const normalized = value / 255;\n  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;\n}\n\nfunction luminance(hex: string): number {\n  const value = hex.replace("#", "");\n  const red = channel(Number.parseInt(value.slice(0, 2), 16));\n  const green = channel(Number.parseInt(value.slice(2, 4), 16));\n  const blue = channel(Number.parseInt(value.slice(4, 6), 16));\n  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;\n}\n\nfunction contrast(foreground: string, background: string): number {\n  const first = luminance(foreground);\n  const second = luminance(background);\n  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);\n}\n\nconst normalTextPairs: Array<[string, string, string]> = [\n  ["primary sur blanc", colors.primary, colors.white],\n  ["texte clair sur fond primaire doux", colors.text, colors.primarySoft],\n  ["texte atténué sur surface", colors.textMuted, colors.surface],\n  ["texte atténué sur fond", colors.textMuted, colors.background],\n  ["texte atténué sur surface douce", colors.textMuted, colors.surfaceMuted],\n  ["succès sur fond succès", colors.success, colors.successSoft],\n  ["avertissement sur fond avertissement", colors.warning, colors.warningSoft],\n  ["erreur sur fond erreur", colors.danger, colors.dangerSoft],\n  ["blanc sur bleu primaire", colors.white, colors.primary],\n  ["blanc sur bleu nuit", colors.white, colors.navy],\n  ["blanc sur magenta du gradient", colors.white, colors.magenta]\n];\n\nconst lightTextPairs: Array<[string, string, string]> = [\n  ["light texte principal sur fond", lightSemanticPalette.text, lightSemanticPalette.background],\n  ["light texte secondaire sur surface", lightSemanticPalette.textSecondary, lightSemanticPalette.surface],\n  ["light texte atténué sur surface", lightSemanticPalette.textMuted, lightSemanticPalette.surface],\n  ["light accent sur surface", lightSemanticPalette.accent, lightSemanticPalette.surface],\n  ["light violet sur surface", lightSemanticPalette.violet, lightSemanticPalette.surface],\n  ["light orange sur surface", lightSemanticPalette.orange, lightSemanticPalette.surface],\n  ["light succès", lightSemanticPalette.success, lightSemanticPalette.successSoft],\n  ["light avertissement", lightSemanticPalette.warning, lightSemanticPalette.warningSoft],\n  ["light erreur", lightSemanticPalette.danger, lightSemanticPalette.dangerSoft]\n];\n\ntest("les couleurs de texte principales respectent WCAG AA", () => {\n  for (const [label, foreground, background] of [...normalTextPairs, ...lightTextPairs]) {\n    const ratio = contrast(foreground, background);\n    ok(ratio >= 4.5, \\`${'${label}'}: contraste ${'${ratio.toFixed(2)}'} inférieur à 4.5\\`);\n  }\n});\n`);

console.log("Connexio UX finalization patches applied.");
