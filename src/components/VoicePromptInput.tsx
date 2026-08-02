import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent
} from "expo-speech-recognition";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors } from "../theme";

interface VoicePromptInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  prompt: string;
  maxLength: number;
}

export function VoicePromptInput({
  value,
  onChangeText,
  placeholder,
  prompt,
  maxLength
}: VoicePromptInputProps) {
  const [listening, setListening] = useState(false);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const promptedRef = useRef(false);
  const bars = useMemo(
    () => Array.from({ length: 7 }, (_, index) => 8 + Math.max(0, volume) * (1 + (index % 3) * 0.25)),
    [volume]
  );

  useSpeechRecognitionEvent("start", () => {
    setListening(true);
    setError(null);
  });
  useSpeechRecognitionEvent("end", () => {
    setListening(false);
    setVolume(0);
  });
  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript?.trim();
    if (transcript) onChangeText(transcript.slice(0, maxLength));
  });
  useSpeechRecognitionEvent("volumechange", (event) => {
    setVolume(Math.max(0, event.value));
  });
  useSpeechRecognitionEvent("error", (event) => {
    if (event.error === "aborted") return;
    setListening(false);
    setError(event.message || "La dictée a été interrompue.");
  });

  useEffect(() => {
    if (promptedRef.current) return;
    promptedRef.current = true;
    const timer = setTimeout(() => {
      Speech.speak(prompt, { language: "fr-FR", rate: 0.92, pitch: 1 });
    }, 260);
    return () => {
      clearTimeout(timer);
      Speech.stop();
      ExpoSpeechRecognitionModule.abort();
    };
  }, [prompt]);

  const toggleListening = async () => {
    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    try {
      await Speech.stop();
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error("Autorisez le microphone et la reconnaissance vocale pour dicter l’objet de l’appel.");
      }
      ExpoSpeechRecognitionModule.start({
        lang: "fr-FR",
        interimResults: true,
        continuous: false,
        maxAlternatives: 1,
        volumeChangeEventOptions: { enabled: true, intervalMillis: 120 }
      });
    } catch (recognitionError) {
      const message = recognitionError instanceof Error
        ? recognitionError.message
        : "La dictée vocale n’est pas disponible sur cet appareil.";
      setError(message);
      Alert.alert("Dictée indisponible", message);
    }
  };

  return (
    <View>
      <View style={[styles.field, listening && styles.fieldListening]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          maxLength={maxLength}
          multiline
          textAlignVertical="top"
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={listening ? "Arrêter la dictée" : "Dicter l’objet de l’appel"}
          accessibilityState={{ selected: listening }}
          onPress={() => void toggleListening()}
          style={[styles.micButton, listening && styles.micButtonListening]}
        >
          <Ionicons name={listening ? "stop" : "mic"} size={21} color={colors.white} />
        </Pressable>
      </View>
      <View style={styles.voiceStatus}>
        <View style={styles.waveform} accessibilityElementsHidden>
          {bars.map((height, index) => (
            <View key={`prompt-wave-${index}`} style={[styles.waveBar, { height: listening ? Math.min(25, height) : 5 }]} />
          ))}
        </View>
        <Text style={[styles.hint, error && styles.error]} numberOfLines={2}>
          {error ?? (listening ? "Je vous écoute…" : "Touchez le micro puis parlez.")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 96,
    marginTop: 8,
    padding: 6,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceStrong,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 5
  },
  fieldListening: { borderColor: colors.violet },
  input: { flex: 1, minHeight: 82, padding: 7, color: colors.text, fontSize: 14, lineHeight: 20 },
  micButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  micButtonListening: { backgroundColor: colors.danger },
  voiceStatus: { minHeight: 28, marginTop: 5, flexDirection: "row", alignItems: "center", gap: 8 },
  waveform: { width: 52, height: 25, flexDirection: "row", alignItems: "center", gap: 2 },
  waveBar: { width: 4, borderRadius: 2, backgroundColor: colors.orange },
  hint: { flex: 1, color: colors.textMuted, fontSize: 9.5, fontWeight: "800" },
  error: { color: colors.danger }
});
