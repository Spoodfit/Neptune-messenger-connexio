from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def text(path): return (ROOT / path).read_text()
def write(path, value): (ROOT / path).write_text(value)
def replace(path, old, new, expected=1):
    value = text(path)
    actual = value.count(old)
    if actual != expected:
        raise SystemExit(f"{path}: expected {expected}, found {actual}: {old[:120]!r}")
    write(path, value.replace(old, new, expected))

# Do not let the global native Alert migration rewrite the already-migrated AppAlert facade.
for path in [*ROOT.joinpath("app").rglob("*.tsx"), *ROOT.joinpath("src").rglob("*.tsx")]:
    value = path.read_text()
    if "AppAppAlert.alert" in value:
        path.write_text(value.replace("AppAppAlert.alert", "AppAlert.alert"))

# TS noUncheckedIndexedAccess: make the first validated SMS recipient explicit.
replace(
    "app/contact-actions.tsx",
    '    const firstName = valid.length === 1 ? valid[0].displayName.split(" ")[0] : "";\n    const body = valid.length === 1\n      ? `Bonjour ${firstName || valid[0].displayName}, je t’invite à découvrir Connexio by Neptune, l’app de mise en relation du réseau Neptune Business. ${env.businessWebBaseUrl}`',
    '    const primary = valid[0]!;\n    const firstName = valid.length === 1 ? primary.displayName.split(" ")[0] : "";\n    const body = valid.length === 1\n      ? `Bonjour ${firstName || primary.displayName}, je t’invite à découvrir Connexio by Neptune, l’app de mise en relation du réseau Neptune Business. ${env.businessWebBaseUrl}`',
)

# A left group stays discoverable and can be joined again.
replace(
    "src/providers/ExperienceProvider.tsx",
    '  leaveConversation: (conversationId: string) => void;\n  updateGroup:',
    '  leaveConversation: (conversationId: string) => void;\n  joinConversation: (conversationId: string) => Promise<void>;\n  updateGroup:',
)
replace(
    "src/providers/ExperienceProvider.tsx",
    '  const isConversationVisible = useCallback(\n    (conversation: Conversation) => !leftConversationIds.has(conversation.id),\n    [leftConversationIds]\n  );',
    '  const isConversationVisible = useCallback(\n    (conversation: Conversation) => {\n      if (!leftConversationIds.has(conversation.id)) return true;\n      return conversation.type !== "direct" && conversation.type !== "small_group";\n    },\n    [leftConversationIds]\n  );',
)
replace(
    "src/providers/ExperienceProvider.tsx",
    '  const updateGroup = useCallback(',
    '  const joinConversation = useCallback(\n    async (conversationId: string) => {\n      const wasLeft = leftConversationIds.has(conversationId);\n      setLeftConversationIds((previous) => {\n        const next = new Set(previous);\n        next.delete(conversationId);\n        return next;\n      });\n      if (api && !isLocalId(conversationId)) {\n        try {\n          await api.joinGroup(conversationId);\n        } catch (error) {\n          if (wasLeft) setLeftConversationIds((previous) => new Set(previous).add(conversationId));\n          throw error;\n        }\n      }\n    },\n    [api, leftConversationIds]\n  );\n\n  const updateGroup = useCallback(',
)
replace(
    "src/providers/ExperienceProvider.tsx",
    '      leaveConversation,\n      updateGroup,',
    '      leaveConversation,\n      joinConversation,\n      updateGroup,',
)
replace(
    "src/providers/ExperienceProvider.tsx",
    '      isConversationVisible,\n      localConversations,',
    '      isConversationVisible,\n      joinConversation,\n      localConversations,',
)

# Messages: tapping a left group rejoins it; the long-press sheet exposes the same action.
replace(
    "app/(tabs)/messages.tsx",
    'import { colors, gradients, spacing, typography } from "@/theme";',
    'import { AppAlert } from "@/services/ui/AppAlert";\nimport { colors, gradients, spacing, typography } from "@/theme";',
)
replace(
    "app/(tabs)/messages.tsx",
    '  const { members, localConversations, decorateConversation, isConversationVisible, toggleConversationMuted, leaveConversation } = useExperience();',
    '  const { members, localConversations, decorateConversation, isConversationVisible, toggleConversationMuted, leaveConversation, joinConversation } = useExperience();',
)
replace(
    "app/(tabs)/messages.tsx",
    '  const openConversation = (conversation: Conversation) => {\n    const mentioned = matchesMention(conversation, mentionAliases) && !isConversationMentionSeen(conversation);\n    restorePrivateConversation(conversation.id);\n    if (mentioned) markConversationMentionSeen(conversation);\n    router.push({ pathname: "/chat/[id]", params: { id: conversation.id, ...(mentioned ? { focusMention: "1" } : {}) } });\n  };',
    '  const openConversation = async (conversation: Conversation) => {\n    try {\n      if (conversation.left) {\n        await joinConversation(conversation.id);\n        await refreshConversations();\n      }\n      const mentioned = matchesMention(conversation, mentionAliases) && !isConversationMentionSeen(conversation);\n      restorePrivateConversation(conversation.id);\n      if (mentioned) markConversationMentionSeen(conversation);\n      router.push({ pathname: "/chat/[id]", params: { id: conversation.id, ...(mentioned ? { focusMention: "1" } : {}) } });\n    } catch (error) {\n      AppAlert.alert("Impossible de rejoindre le groupe", error instanceof Error ? error.message : "Réessayez dans quelques instants.");\n    }\n  };',
)
replace(
    "app/(tabs)/messages.tsx",
    '  const leaveSelectedGroup = () => {\n    if (!selectedConversation) return;\n    if (selectedConversation.id.startsWith("local-group-")) removeCreatedGroup(selectedConversation.id);\n    else leaveConversation(selectedConversation.id);\n    closeMenu();\n  };',
    '  const leaveSelectedGroup = () => {\n    if (!selectedConversation) return;\n    if (selectedConversation.id.startsWith("local-group-")) removeCreatedGroup(selectedConversation.id);\n    else leaveConversation(selectedConversation.id);\n    closeMenu();\n  };\n  const joinSelectedGroup = async () => {\n    if (!selectedConversation) return;\n    const id = selectedConversation.id;\n    closeMenu();\n    try {\n      await joinConversation(id);\n      await refreshConversations();\n      router.push(`/chat/${encodeURIComponent(id)}`);\n    } catch (error) {\n      AppAlert.alert("Impossible de rejoindre le groupe", error instanceof Error ? error.message : "Réessayez dans quelques instants.");\n    }\n  };',
)
replace(
    "app/(tabs)/messages.tsx",
    '            const row = <ConversationRow conversation={item} members={members} mentioned={mentioned} muted={item.muted} onPress={() => openConversation(item)} onLongPress={() => setSelectedConversation(item)} />;',
    '            const row = <ConversationRow conversation={item} members={members} mentioned={mentioned} muted={item.muted} onPress={() => void openConversation(item)} onLongPress={() => setSelectedConversation(item)} />;',
)
replace(
    "app/(tabs)/messages.tsx",
    '{selectedConversation && selectedConversation.type !== "direct" && selectedConversation.type !== "announcement" ? <Pressable style={[styles.sheetAction, { marginTop: 4, backgroundColor: theme.dangerSoft }]} onPress={leaveSelectedGroup}><Ionicons name="exit-outline" size={21} color={theme.danger} /><Text style={[styles.sheetActionText, { color: theme.danger }]}>Quitter le groupe</Text></Pressable> : null}',
    '{selectedConversation && selectedConversation.type !== "direct" && selectedConversation.type !== "announcement" ? (selectedConversation.left ? <Pressable style={[styles.sheetAction, { marginTop: 4, backgroundColor: theme.successSoft }]} onPress={() => void joinSelectedGroup()}><Ionicons name="enter-outline" size={21} color={theme.success} /><Text style={[styles.sheetActionText, { color: theme.success }]}>Rejoindre le groupe</Text></Pressable> : <Pressable style={[styles.sheetAction, { marginTop: 4, backgroundColor: theme.dangerSoft }]} onPress={leaveSelectedGroup}><Ionicons name="exit-outline" size={21} color={theme.danger} /><Text style={[styles.sheetActionText, { color: theme.danger }]}>Quitter le groupe</Text></Pressable>) : null}',
)

# Group details: no duplicate backend leave call, and a left group exposes Rejoindre.
replace(
    "app/group/[id].tsx",
    '    leaveConversation,\n    updateGroup',
    '    leaveConversation,\n    joinConversation,\n    updateGroup',
)
replace(
    "app/group/[id].tsx",
    '  const leave = () => {\n    AppAlert.alert("Quitter le groupe ?", "Le groupe disparaîtra de vos discussions.", [\n      { text: "Annuler", style: "cancel" },\n      {\n        text: "Quitter",\n        style: "destructive",\n        onPress: () => {\n          void (async () => {\n            try {\n              if (api && !id.startsWith("local-")) {\n                await api.leaveGroup(id);\n                await refreshConversations();\n              } else if (getCreatedGroup(id)) removeCreatedGroup(id);\n              else leaveConversation(id);\n              router.replace("/(tabs)/messages");\n            } catch (error) {\n              AppAlert.alert(\n                "Départ impossible",\n                error instanceof Error ? error.message : "Réessayez ultérieurement."\n              );\n            }\n          })();\n        }\n      }\n    ]);\n  };',
    '  const leave = () => {\n    AppAlert.alert("Quitter le groupe ?", "Vous pourrez le rejoindre à nouveau depuis vos groupes.", [\n      { text: "Annuler", style: "cancel" },\n      { text: "Quitter", style: "destructive", onPress: () => {\n        if (getCreatedGroup(id)) removeCreatedGroup(id);\n        else leaveConversation(id);\n        router.replace("/(tabs)/messages");\n      } }\n    ]);\n  };\n\n  const rejoin = async () => {\n    try {\n      await joinConversation(id);\n      await refreshConversations();\n      router.replace(`/chat/${encodeURIComponent(id)}`);\n    } catch (error) {\n      AppAlert.alert("Impossible de rejoindre le groupe", error instanceof Error ? error.message : "Réessayez ultérieurement.");\n    }\n  };',
)
replace(
    "app/group/[id].tsx",
    '          <Pressable accessibilityRole="button" onPress={leave} style={styles.quickAction}>\n            <Ionicons name="exit-outline" size={21} color={theme.danger} />\n            <Text style={[styles.quickLabel, styles.dangerText]}>Quitter</Text>\n          </Pressable>',
    '          {conversation.left ? <Pressable accessibilityRole="button" onPress={() => void rejoin()} style={[styles.quickAction, { backgroundColor: theme.successSoft }]}><Ionicons name="enter-outline" size={21} color={theme.success} /><Text style={[styles.quickLabel, { color: theme.success }]}>Rejoindre</Text></Pressable> : <Pressable accessibilityRole="button" onPress={leave} style={styles.quickAction}><Ionicons name="exit-outline" size={21} color={theme.danger} /><Text style={[styles.quickLabel, styles.dangerText]}>Quitter</Text></Pressable>}',
)

print("ux-round2 postfix applied")
