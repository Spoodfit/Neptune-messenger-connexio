import { Ionicons } from "@expo/vector-icons";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState
} from "expo-audio";
import * as Crypto from "expo-crypto";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, gradients } from "../theme";
import type { MessageAttachment } from "../types/messaging";

interface InlineVoiceRecorderProps {
  onCancel: () => void;
  onRecorded: (attachment: MessageAttachment) => void | Promise<void>;
  maxDurationSeconds?: number;
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function InlineVoiceRecorder({
  onCancel,
  onRecorded,
  maxDurationSeconds = 300
}: InlineVoiceRecorderProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 90);
  const [preparing, setPreparing] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const mountedRef = useRef(true);
  const elapsedSeconds = recorderState.durationMillis / 1000;
  const waveform = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) => {
        const phase = elapsedSeconds * 7 + index * 0.9;
        return 7 + Math.round(Math.abs(Math.sin(phase)) * 22);
      }),
    [elapsedSeconds]
  );

  useEffect(() => {
    mountedRef.current = true;
    void (async () => {
      try {
        const permission = await requestRecordingPermissionsAsync();
        if (!permission.granted) {
          throw new Error("Autorisez le microphone pour enregistrer un vocal.");
        }
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true
        });
        await recorder.prepareToRecordAsync();
        recorder.record({ forDuration: maxDurationSeconds });
        if (mountedRef.current) setPreparing(false);
      } catch (error) {
        Alert.alert(
          "Microphone indisponible",
          error instanceof Error ? error.message : "L’enregistrement vocal n’a pas pu démarrer."
        );
        onCancel();
      }
    })();

    return () => {
      mountedRef.current = false;
      if (recorder.isRecording) void recorder.stop().catch(() => undefined);
      void setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    };
  }, [maxDurationSeconds, onCancel, recorder]);

  const cancel = async () => {
    if (finishing) return;
    setFinishing(true);
    if (recorder.isRecording) await recorder.stop().catch(() => undefined);
    await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    onCancel();
  };

  const send = async () => {
    if (finishing || preparing) return;
    setFinishing(true);
    try {
      if (recorder.isRecording) await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      const uri = recorder.uri;
      if (!uri) throw new Error("Le fichier vocal n’a pas été créé.");
      await onRecorded({
        id: `local-voice-${Crypto.randomUUID()}`,
        kind: "audio",
        name: `vocal-${Date.now()}.m4a`,
        uri,
        mimeType: "audio/mp4",
        durationSeconds: Math.max(1, Math.round(elapsedSeconds)),
        status: "local",
        uploadProgress: 0,
        transcriptStatus: "pending"
      });
    } catch (error) {
      setFinishing(false);
      Alert.alert(
        "Vocal indisponible",
        error instanceof Error ? error.message : "Le vocal n’a pas pu être envoyé."
      );
    }
  };

  return (
    <View style={styles.shell} accessibilityLiveRegion="polite">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Annuler le vocal"
        onPress={() => void cancel()}
        style={styles.action}
      >
        <Ionicons name="trash-outline" size={20} color={colors.danger} />
      </Pressable>
      <View style={styles.recordingContent}>
        <View style={styles.recordingHeader}>
          <View style={styles.liveDot} />
          <Text style={styles.timer}>{formatDuration(elapsedSeconds)}</Text>
          <Text style={styles.status}>{preparing ? "Microphone…" : "Enregistrement"}</Text>
        </View>
        <View style={styles.waveform} accessibilityElementsHidden>
          {waveform.map((height, index) => (
            <View key={`inline-wave-${index}`} style={[styles.waveBar, { height }]} />
          ))}
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Envoyer le vocal"
        accessibilityState={{ busy: finishing, disabled: preparing }}
        disabled={preparing || finishing}
        onPress={() => void send()}
        style={styles.sendTarget}
      >
        <LinearGradient colors={gradients.primary} style={styles.sendButton}>
          {preparing || finishing ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="send" size={19} color={colors.white} />
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    minHeight: 58,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(107,79,234,0.42)",
    backgroundColor: colors.surfaceStrong,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 5,
    overflow: "hidden"
  },
  action: { width: 44, height: 48, alignItems: "center", justifyContent: "center" },
  recordingContent: { flex: 1, minWidth: 0 },
  recordingHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger },
  timer: { color: colors.text, fontSize: 11, fontWeight: "900" },
  status: { color: colors.textMuted, fontSize: 9, fontWeight: "800" },
  waveform: { height: 31, flexDirection: "row", alignItems: "center", gap: 2, overflow: "hidden" },
  waveBar: { width: 2.5, borderRadius: 2, backgroundColor: colors.orange },
  sendTarget: { width: 50, height: 50, alignItems: "center", justifyContent: "center" },
  sendButton: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" }
});
