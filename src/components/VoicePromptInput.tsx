import { Text } from "@/components/LocalizedText";
import { TextInput } from "@/components/LocalizedTextInput";
import {
  Ionicons } from "@expo/vector-icons";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent
} from "expo-speech-recognition";
import { useMemo,
  useState } from "react";
import { Pressable,
  StyleSheet,
  View
} from "react-native";

import { useAppTheme } from "../providers/ThemeProvider";
import { AppAlert } from "../services/ui/AppAlert";
import { colors } from "../theme";

interface VoicePromptInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  maxLength: number;
  suggestions?: string[];
  onSubmit?: () => void;
  autoFocus?: boolean;
}

const DEFAULT_SUGGESTIONS = ["Faire un point rapide", "Valider une décision", "Demander un retour"];

export function VoicePromptInput({ value, onChangeText, placeholder, maxLength, suggestions = DEFAULT_SUGGESTIONS, onSubmit, autoFocus = false }: VoicePromptInputProps) {
  const theme = useAppTheme();
  const [listening, setListening] = useState(false);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const bars = useMemo(() => Array.from({ length: 9 }, (_, index) => 7 + Math.max(0, volume) * (1 + (index % 3) * 0.22)), [volume]);

  useSpeechRecognitionEvent("start", () => { setListening(true); setError(null); });
  useSpeechRecognitionEvent("end", () => { setListening(false); setVolume(0); });
  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript?.trim();
    if (transcript) onChangeText(transcript.slice(0, maxLength));
  });
  useSpeechRecognitionEvent("volumechange", (event) => setVolume(Math.max(0, event.value)));
  useSpeechRecognitionEvent("error", (event) => {
    if (event.error === "aborted") return;
    setListening(false);
    setError(event.message || "La dictée a été interrompue.");
  });

  const toggleListening = async () => {
    if (listening) { ExpoSpeechRecognitionModule.stop(); return; }
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) throw new Error("Autorisez le microphone et la reconnaissance vocale pour dicter l’objet de l’appel.");
      ExpoSpeechRecognitionModule.start({ lang: "fr-FR", interimResults: true, continuous: false, maxAlternatives: 1, volumeChangeEventOptions: { enabled: true, intervalMillis: 120 } });
    } catch (recognitionError) {
      const message = recognitionError instanceof Error ? recognitionError.message : "La dictée vocale n’est pas disponible sur cet appareil.";
      setError(message);
      AppAlert.alert("Dictée indisponible", message);
    }
  };

  return (
    <View>
      <View style={[styles.field, { borderColor: listening ? theme.violet : theme.border, backgroundColor: theme.inputBackground }]}>
        <TextInput
          autoFocus={autoFocus}
          autoCapitalize="sentences"
          accessibilityLabel="Objet de l’appel"
          accessibilityHint="Écrivez la raison de l’appel ou utilisez le microphone"
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder={placeholder}
          placeholderTextColor={theme.pageTextMuted}
          maxLength={maxLength}
          multiline={false}
          numberOfLines={1}
          returnKeyType="go"
          style={[styles.input, { color: theme.pageText }]}
        />
        <Pressable accessibilityRole="button" accessibilityLabel={listening ? "Arrêter la dictée" : "Dicter l’objet de l’appel"} accessibilityState={{ selected: listening }} onPress={() => void toggleListening()} style={[styles.micButton, { backgroundColor: listening ? theme.danger : colors.primary }]}>
          <Ionicons name={listening ? "stop" : "mic"} size={20} color={colors.white} />
        </Pressable>
      </View>

      <View style={styles.suggestions}>
        {suggestions.map((suggestion) => (
          <Pressable key={suggestion} accessibilityRole="button" accessibilityLabel={`Utiliser : ${suggestion}`} onPress={() => onChangeText(suggestion)} style={({ pressed }) => [styles.suggestion, { borderColor: theme.borderSoft, backgroundColor: theme.surfaceStrong }, pressed && styles.pressed]}>
            <Text style={[styles.suggestionText, { color: theme.pageTextSecondary }]}>{suggestion}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.voiceStatus}>
        <View style={styles.waveform} accessibilityElementsHidden>
          {bars.map((height, index) => <View key={`prompt-wave-${index}`} style={[styles.waveBar, { height: listening ? Math.min(24, height) : 4, backgroundColor: theme.orange }]} />)}
        </View>
        <Text style={[styles.hint, { color: error ? theme.danger : theme.pageTextMuted }]} numberOfLines={2}>{error ?? (listening ? "Je vous écoute…" : "Écrivez, choisissez une suggestion ou touchez le micro.")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { minHeight: 56, marginTop: 8, padding: 5, borderRadius: 18, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  input: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 9, fontSize: 14 },
  micButton: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  suggestions: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  suggestion: { minHeight: 48, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  suggestionText: { fontSize: 11, fontWeight: "800" },
  voiceStatus: { minHeight: 28, marginTop: 5, flexDirection: "row", alignItems: "center", gap: 8 },
  waveform: { width: 62, height: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  waveBar: { width: 3, borderRadius: 2 },
  hint: { flex: 1, fontSize: 11, fontWeight: "800" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] }
});
