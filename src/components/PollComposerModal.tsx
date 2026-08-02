import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";

import { colors, radii, spacing, typography } from "../theme";
import type { CreatePollInput } from "../types/messaging";

interface PollComposerModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (input: CreatePollInput) => void | Promise<void>;
}

const EMPTY_OPTIONS = ["", ""];

export function PollComposerModal({
  visible,
  onClose,
  onCreate
}: PollComposerModalProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(EMPTY_OPTIONS);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setQuestion("");
    setOptions(EMPTY_OPTIONS);
    setAllowMultiple(false);
    setAnonymous(false);
    setCreating(false);
  }, [visible]);

  const updateOption = (index: number, value: string) => {
    setOptions((previous) =>
      previous.map((option, optionIndex) =>
        optionIndex === index ? value : option
      )
    );
  };

  const submit = async () => {
    if (creating) return;
    const cleanQuestion = question.trim();
    const cleanOptions = options.map((option) => option.trim()).filter(Boolean);
    if (cleanQuestion.length < 3) {
      Alert.alert("Question requise", "Ajoutez une question de sondage claire.");
      return;
    }
    if (cleanOptions.length < 2) {
      Alert.alert("Réponses requises", "Ajoutez au moins deux choix.");
      return;
    }
    if (new Set(cleanOptions.map((item) => item.toLocaleLowerCase("fr"))).size !== cleanOptions.length) {
      Alert.alert("Choix en double", "Chaque réponse doit être différente.");
      return;
    }
    setCreating(true);
    try {
      await onCreate({
        question: cleanQuestion,
        options: cleanOptions,
        allowMultiple,
        anonymous
      });
      onClose();
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Créer un sondage</Text>
              <Text style={styles.subtitle}>
                Les votes sont synchronisés en temps réel dans la conversation.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer le sondage"
              onPress={onClose}
              style={styles.close}
            >
              <Ionicons name="close" size={21} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.label}>Question</Text>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="Quel créneau préférez-vous ?"
              placeholderTextColor={colors.textMuted}
              maxLength={240}
              multiline
              style={[styles.input, styles.question]}
            />

            <Text style={styles.label}>Réponses</Text>
            {options.map((option, index) => (
              <View key={`poll-option-${index}`} style={styles.optionRow}>
                <View style={styles.optionNumber}>
                  <Text style={styles.optionNumberText}>{index + 1}</Text>
                </View>
                <TextInput
                  value={option}
                  onChangeText={(value) => updateOption(index, value)}
                  placeholder={`Choix ${index + 1}`}
                  placeholderTextColor={colors.textMuted}
                  maxLength={120}
                  style={styles.optionInput}
                />
                {options.length > 2 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Supprimer le choix ${index + 1}`}
                    onPress={() =>
                      setOptions((previous) =>
                        previous.filter((_, optionIndex) => optionIndex !== index)
                      )
                    }
                    style={styles.remove}
                  >
                    <Ionicons name="remove-circle-outline" size={21} color={colors.danger} />
                  </Pressable>
                ) : null}
              </View>
            ))}

            {options.length < 10 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setOptions((previous) => [...previous, ""])}
                style={styles.addOption}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.orange} />
                <Text style={styles.addOptionText}>Ajouter une réponse</Text>
              </Pressable>
            ) : null}

            <View style={styles.settingRow}>
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Choix multiples</Text>
                <Text style={styles.settingSubtitle}>
                  Un membre peut voter pour plusieurs réponses.
                </Text>
              </View>
              <Switch
                accessibilityLabel="Autoriser les choix multiples"
                value={allowMultiple}
                onValueChange={setAllowMultiple}
                trackColor={{ false: colors.surfaceMuted, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Votes anonymes</Text>
                <Text style={styles.settingSubtitle}>
                  Seuls les totaux sont visibles par les membres.
                </Text>
              </View>
              <Switch
                accessibilityLabel="Rendre les votes anonymes"
                value={anonymous}
                onValueChange={setAnonymous}
                trackColor={{ false: colors.surfaceMuted, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Publier le sondage"
            accessibilityState={{ busy: creating }}
            disabled={creating}
            onPress={() => void submit()}
            style={[styles.submit, creating && styles.disabled]}
          >
            <Ionicons name="stats-chart" size={19} color={colors.white} />
            <Text style={styles.submitText}>
              {creating ? "Publication…" : "Publier le sondage"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.68)" },
  sheet: {
    width: "100%",
    maxWidth: 680,
    maxHeight: "92%",
    alignSelf: "center",
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  handle: { width: 42, height: 4, borderRadius: 2, alignSelf: "center", backgroundColor: colors.textMuted, marginBottom: 10 },
  header: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerText: { flex: 1, minWidth: 0 },
  title: { ...typography.heading3, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
  close: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceStrong },
  content: { paddingBottom: spacing.md },
  label: { color: colors.textSecondary, fontSize: 10, fontWeight: "900", marginTop: 12, marginBottom: 6 },
  input: { borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceStrong, color: colors.text, paddingHorizontal: 12, paddingVertical: 10 },
  question: { minHeight: 72, textAlignVertical: "top" },
  optionRow: { minHeight: 50, marginBottom: 7, flexDirection: "row", alignItems: "center", gap: 8 },
  optionNumber: { width: 31, height: 31, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  optionNumberText: { color: colors.orange, fontSize: 11, fontWeight: "900" },
  optionInput: { flex: 1, minWidth: 0, minHeight: 48, borderRadius: 15, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceStrong, color: colors.text, paddingHorizontal: 12 },
  remove: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  addOption: { minHeight: 46, borderRadius: 15, borderWidth: 1, borderStyle: "dashed", borderColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  addOptionText: { color: colors.orange, fontSize: 11, fontWeight: "800" },
  settingRow: { minHeight: 66, marginTop: 8, paddingHorizontal: 10, borderRadius: 17, backgroundColor: colors.surfaceStrong, flexDirection: "row", alignItems: "center", gap: 12 },
  settingText: { flex: 1, minWidth: 0 },
  settingTitle: { color: colors.text, fontSize: 12, fontWeight: "900" },
  settingSubtitle: { color: colors.textMuted, fontSize: 9.5, marginTop: 3 },
  submit: { minHeight: 52, borderRadius: 18, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  submitText: { color: colors.white, fontSize: 14, fontWeight: "900" },
  disabled: { opacity: 0.5 }
});
