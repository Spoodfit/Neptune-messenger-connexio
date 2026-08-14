import { useMemo } from "react";
import * as Crypto from "expo-crypto";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { AppAlert } from "@/services/ui/AppAlert";

import { colors, gradients, spacing, typography } from "../theme";
import type { VoiceRecorderModalProps } from "./VoiceRecorderModal.types";

function formatDuration(durationSeconds: number): string {
  const total = Math.max(0, Math.floor(durationSeconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function chooseMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((type) =>
    MediaRecorder.isTypeSupported(type)
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du vocal impossible."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

import { useAppTheme } from "@/providers/ThemeProvider";
export default function VoiceRecorderModal({
  visible,
  onClose,
  onRecorded,
  maxDurationSeconds = 300,
  maxSizeBytes = 12 * 1024 * 1024
}: VoiceRecorderModalProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recording, setRecording] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const cleanup = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setRecording(false);
  };

  useEffect(() => cleanup, []);

  useEffect(() => {
    if (!visible) cleanup();
  }, [visible]);

  const finishRecording = async (recorder: MediaRecorder) => {
    setPreparing(true);
    try {
      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || "audio/webm"
      });
      const durationSeconds = Math.max(
        1,
        Math.round((Date.now() - startedAtRef.current) / 1000)
      );
      if (blob.size > maxSizeBytes) {
        throw new Error(
          `Le vocal dépasse ${Math.round(
            maxSizeBytes / 1024 / 1024
          )} Mo. Enregistrez un message plus court.`
        );
      }
      const dataUrl = await blobToDataUrl(blob);
      const extension = blob.type.includes("mp4") ? "m4a" : "webm";
      onRecorded({
        id: `local-voice-${Crypto.randomUUID()}`,
        kind: "audio",
        name: `vocal-${Date.now()}.${extension}`,
        uri: dataUrl,
        mimeType: blob.type || "audio/webm",
        sizeBytes: blob.size,
        durationSeconds,
        status: "local",
        uploadProgress: 0,
        transcriptStatus: "pending"
      });
      onClose();
    } catch (error) {
      AppAlert.alert(
        "Vocal indisponible",
        error instanceof Error ? error.message : "Le vocal n’a pas pu être préparé."
      );
    } finally {
      cleanup();
      setPreparing(false);
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    setRecording(false);
    recorder.stop();
  };

  const startRecording = async () => {
    if (preparing || recording) return;
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      AppAlert.alert(
        "Microphone non compatible",
        "Ce navigateur ne prend pas en charge l’enregistrement vocal intégré."
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      const mimeType = chooseMimeType();
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 64_000
      });
      recorderRef.current = recorder;
      streamRef.current = stream;
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      setElapsedSeconds(0);

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
        const size = chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
        if (size > maxSizeBytes && recorder.state === "recording") recorder.stop();
      };
      recorder.onerror = () => {
        cleanup();
        AppAlert.alert(
          "Microphone interrompu",
          "L’enregistrement vocal a été interrompu par le navigateur."
        );
      };
      recorder.onstop = () => void finishRecording(recorder);
      recorder.start(500);
      setRecording(true);
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setElapsedSeconds(elapsed);
        if (elapsed >= maxDurationSeconds && recorder.state === "recording") {
          recorder.stop();
        }
      }, 250);
    } catch (error) {
      cleanup();
      AppAlert.alert(
        "Microphone indisponible",
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Autorisez le microphone dans le navigateur pour enregistrer un vocal."
          : "Le microphone n’a pas pu être ouvert."
      );
    }
  };

  const close = () => {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") {
      recorder.onstop = null;
      recorder.stop();
    }
    cleanup();
    onClose();
  };

  const waveform = [8, 16, 24, 12, 20, 9, 27, 15, 23, 11, 18, 26, 10, 21, 13];

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <LinearGradient colors={gradients.primaryWarm} style={styles.iconShell}>
              <Text style={styles.icon}>●</Text>
            </LinearGradient>
            <View style={styles.headerText}>
              <Text style={styles.title}>Message vocal</Text>
              <Text style={styles.subtitle}>
                Enregistrez puis envoyez-le comme une pièce jointe sécurisée.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer l’enregistreur vocal"
              onPress={close}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <View style={[styles.visual, recording && styles.visualRecording]}>
            <Text style={styles.timer}>{formatDuration(elapsedSeconds)}</Text>
            <View style={styles.waveform} accessibilityElementsHidden>
              {waveform.map((height, index) => (
                <View
                  key={`voice-wave-${index}`}
                  style={[
                    styles.waveBar,
                    { height: recording ? height : 7 }
                  ]}
                />
              ))}
            </View>
            <Text style={styles.status}>
              {preparing
                ? "Préparation du vocal…"
                : recording
                  ? "Enregistrement en cours"
                  : "Appuyez pour commencer"}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              recording ? "Terminer l’enregistrement" : "Commencer l’enregistrement"
            }
            accessibilityState={{ busy: preparing }}
            disabled={preparing}
            onPress={recording ? stopRecording : () => void startRecording()}
            style={[styles.recordTarget, preparing && styles.disabled]}
          >
            <LinearGradient
              colors={recording ? [theme.danger, colors.magenta] : gradients.primaryWarm}
              style={styles.recordButton}
            >
              {preparing ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <View style={recording ? styles.stopIcon : styles.micIcon} />
              )}
            </LinearGradient>
          </Pressable>

          <Text style={styles.hint}>
            {Math.round(maxDurationSeconds / 60)} minutes maximum · {Math.round(
              maxSizeBytes / 1024 / 1024
            )} Mo maximum · transcription générée après l’envoi lorsqu’elle est disponible.
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.72)"
  },
  sheet: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: theme.border,
    backgroundColor: theme.surface
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
    backgroundColor: theme.pageTextMuted
  },
  header: { flexDirection: "row", alignItems: "center", gap: 11 },
  iconShell: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center"
  },
  icon: { color: colors.white, fontSize: 18 },
  headerText: { flex: 1, minWidth: 0 },
  title: { ...typography.heading3, color: theme.pageText },
  subtitle: { ...typography.caption, color: theme.pageTextMuted, marginTop: 3 },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.surfaceStrong
  },
  closeText: { color: theme.pageTextMuted, fontSize: 28, lineHeight: 30 },
  visual: {
    minHeight: 132,
    marginTop: spacing.lg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    backgroundColor: theme.pageBackground,
    alignItems: "center",
    justifyContent: "center",
    gap: 12
  },
  visualRecording: { borderColor: "rgba(244,177,131,0.38)" },
  timer: { color: theme.pageText, fontSize: 34, lineHeight: 40, fontWeight: "900" },
  waveform: { height: 30, flexDirection: "row", alignItems: "center", gap: 3 },
  waveBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: theme.orange
  },
  status: { color: theme.pageTextMuted, fontSize: 11, fontWeight: "800" },
  recordTarget: {
    width: 88,
    height: 88,
    alignSelf: "center",
    marginTop: spacing.lg,
    alignItems: "center",
    justifyContent: "center"
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center"
  },
  micIcon: {
    width: 18,
    height: 27,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: colors.white
  },
  stopIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.white
  },
  hint: {
    ...typography.caption,
    color: theme.pageTextMuted,
    textAlign: "center",
    marginTop: spacing.md
  },
  disabled: { opacity: 0.55 }
});
