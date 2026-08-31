import { Text } from "@/components/LocalizedText";
import { Ionicons } from "@expo/vector-icons";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState
} from "expo-audio";
import * as Crypto from "expo-crypto";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent
} from "expo-speech-recognition";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from "react-native";
import { AppAlert } from "@/services/ui/AppAlert";
import { useAppTheme } from "@/providers/ThemeProvider";

import { getCurrentUiLocaleTag } from "../i18n/uiLocale";
import { colors, gradients } from "../theme";
import type { MessageAttachment } from "../types/messaging";

interface InlineVoiceRecorderProps {
  onCancel: () => void;
  onRecorded: (attachment: MessageAttachment) => void | Promise<void>;
  maxDurationSeconds?: number;
}

const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true
};

const SPEECH_RECORDING_SUPPORTED = (
  Platform.OS === "ios" ||
  (Platform.OS === "android" && Number(Platform.Version) >= 33)
) && ExpoSpeechRecognitionModule.supportsRecording();

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function InlineVoiceRecorder({ onCancel, onRecorded, maxDurationSeconds = 300 }: InlineVoiceRecorderProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 100);
  const [preparing, setPreparing] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [speechElapsedMillis, setSpeechElapsedMillis] = useState(0);
  const [speechMetering, setSpeechMetering] = useState<number | null>(null);
  const mountedRef = useRef(true);
  const startedRef = useRef(false);
  const finalizedRef = useRef(false);
  const restoringAudioRef = useRef<Promise<void> | null>(null);
  const transcriptionRef = useRef("");
  const finalTranscriptionSegmentsRef = useRef<string[]>([]);
  const speechRecordingUriRef = useRef<string | null>(null);
  const speechAudioEndResolverRef = useRef<(() => void) | null>(null);
  const speechStartedAtRef = useRef(0);
  const speechElapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechLimitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackRecorderActiveRef = useRef(false);
  const recognitionActiveRef = useRef(false);
  const onCancelRef = useRef(onCancel);
  const onRecordedRef = useRef(onRecorded);
  const elapsedSeconds = SPEECH_RECORDING_SUPPORTED
    ? speechElapsedMillis / 1000
    : recorderState.durationMillis / 1000;
  const meteringLevel = SPEECH_RECORDING_SUPPORTED
    ? speechMetering ?? 0
    : Math.max(0, Math.min(1, ((recorderState.metering ?? -60) + 60) / 60));
  const waveform = useMemo(
    () => Array.from({ length: 32 }, (_, index) => {
      const phase = elapsedSeconds * 7 + index * 0.9;
      const fallbackLevel = 0.18 + Math.abs(Math.sin(phase)) * 0.42;
      const meterAvailable = SPEECH_RECORDING_SUPPORTED ? speechMetering != null : recorderState.metering != null;
      const liveLevel = meterAvailable ? meteringLevel : fallbackLevel;
      const barVariation = 0.58 + Math.abs(Math.sin(index * 1.17)) * 0.42;
      return 6 + Math.round(liveLevel * barVariation * 25);
    }),
    [elapsedSeconds, meteringLevel, recorderState.metering, speechMetering]
  );

  const stopSpeechTimers = () => {
    if (speechElapsedTimerRef.current) clearInterval(speechElapsedTimerRef.current);
    if (speechLimitTimerRef.current) clearTimeout(speechLimitTimerRef.current);
    speechElapsedTimerRef.current = null;
    speechLimitTimerRef.current = null;
  };

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript?.trim();
    if (!transcript) return;
    if (event.isFinal && finalTranscriptionSegmentsRef.current.at(-1) !== transcript) {
      finalTranscriptionSegmentsRef.current.push(transcript);
    }
    const segments = event.isFinal
      ? finalTranscriptionSegmentsRef.current
      : [...finalTranscriptionSegmentsRef.current, transcript];
    transcriptionRef.current = segments.join(" ").trim();
  });
  useSpeechRecognitionEvent("volumechange", (event) => {
    setSpeechMetering(Math.max(0, Math.min(1, (event.value + 2) / 12)));
  });
  useSpeechRecognitionEvent("audioend", (event) => {
    if (event.uri) speechRecordingUriRef.current = event.uri;
    recognitionActiveRef.current = false;
    stopSpeechTimers();
    speechAudioEndResolverRef.current?.();
    speechAudioEndResolverRef.current = null;
  });
  useSpeechRecognitionEvent("end", () => {
    recognitionActiveRef.current = false;
    stopSpeechTimers();
    if (speechRecordingUriRef.current) {
      speechAudioEndResolverRef.current?.();
      speechAudioEndResolverRef.current = null;
    }
  });

  useEffect(() => { onCancelRef.current = onCancel; }, [onCancel]);
  useEffect(() => { onRecordedRef.current = onRecorded; }, [onRecorded]);

  const restorePlaybackMode = async () => {
    if (restoringAudioRef.current) return restoringAudioRef.current;
    const operation = setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
      .catch(() => undefined)
      .then(() => undefined)
      .finally(() => { restoringAudioRef.current = null; });
    restoringAudioRef.current = operation;
    return operation;
  };

  const stopOnce = async () => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    if (SPEECH_RECORDING_SUPPORTED) {
      stopSpeechTimers();
      if (!recognitionActiveRef.current) return;
      const audioEnded = new Promise<void>((resolve) => { speechAudioEndResolverRef.current = resolve; });
      ExpoSpeechRecognitionModule.stop();
      await Promise.race([
        audioEnded,
        new Promise<void>((resolve) => setTimeout(resolve, 5_000))
      ]);
      return;
    }
    if (fallbackRecorderActiveRef.current || recorderState.isRecording) {
      await recorder.stop().catch(() => undefined);
      fallbackRecorderActiveRef.current = false;
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    if (startedRef.current) return () => { mountedRef.current = false; };
    startedRef.current = true;
    let cancelled = false;

    void (async () => {
      try {
        const permission = SPEECH_RECORDING_SUPPORTED
          ? await ExpoSpeechRecognitionModule.requestPermissionsAsync()
          : await requestRecordingPermissionsAsync();
        if (cancelled) return;
        if (!permission.granted) throw new Error("Autorisez le microphone pour enregistrer un vocal.");
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        if (cancelled) {
          await restorePlaybackMode();
          return;
        }
        if (SPEECH_RECORDING_SUPPORTED) {
          transcriptionRef.current = "";
          finalTranscriptionSegmentsRef.current = [];
          speechRecordingUriRef.current = null;
          speechStartedAtRef.current = Date.now();
          recognitionActiveRef.current = true;
          ExpoSpeechRecognitionModule.start({
            lang: getCurrentUiLocaleTag(),
            interimResults: true,
            continuous: true,
            maxAlternatives: 1,
            addsPunctuation: true,
            recordingOptions: {
              persist: true,
              outputFileName: `connexio-vocal-${Date.now()}.wav`,
              outputSampleRate: 16_000,
              outputEncoding: "pcmFormatInt16"
            },
            volumeChangeEventOptions: { enabled: true, intervalMillis: 100 }
          });
          speechElapsedTimerRef.current = setInterval(() => {
            if (mountedRef.current) setSpeechElapsedMillis(Date.now() - speechStartedAtRef.current);
          }, 100);
          speechLimitTimerRef.current = setTimeout(() => {
            if (recognitionActiveRef.current) ExpoSpeechRecognitionModule.stop();
          }, maxDurationSeconds * 1_000);
        } else {
          await recorder.prepareToRecordAsync();
          if (cancelled) {
            await restorePlaybackMode();
            return;
          }
          recorder.record({ forDuration: maxDurationSeconds });
          fallbackRecorderActiveRef.current = true;
        }
        if (mountedRef.current) setPreparing(false);
      } catch (error) {
        await restorePlaybackMode();
        if (!mountedRef.current || cancelled) return;
        AppAlert.alert(
          "Microphone indisponible",
          error instanceof Error ? error.message : "L’enregistrement vocal n’a pas pu démarrer."
        );
        onCancelRef.current();
      }
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      stopSpeechTimers();
      if (SPEECH_RECORDING_SUPPORTED && recognitionActiveRef.current) {
        recognitionActiveRef.current = false;
        ExpoSpeechRecognitionModule.abort();
      } else if (!finalizedRef.current && fallbackRecorderActiveRef.current) {
        finalizedRef.current = true;
        void recorder.stop().catch(() => undefined).finally(() => { void restorePlaybackMode(); });
      } else {
        void restorePlaybackMode();
      }
    };
    // Le hook expo-audio gère le recorder sur la durée de vie du composant.
    // L'initialisation doit être exécutée une seule fois pour éviter prepare/stop concurrents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancel = async () => {
    if (finishing) return;
    setFinishing(true);
    await stopOnce();
    await restorePlaybackMode();
    onCancelRef.current();
  };

  const send = async () => {
    if (finishing || preparing) return;
    setFinishing(true);
    try {
      await stopOnce();
      await restorePlaybackMode();
      const uri = SPEECH_RECORDING_SUPPORTED ? speechRecordingUriRef.current : recorder.uri;
      if (!uri) throw new Error("Le fichier vocal n’a pas été créé.");
      const transcript = transcriptionRef.current.trim() || undefined;
      const speechRecording = SPEECH_RECORDING_SUPPORTED;
      await onRecordedRef.current({
        id: `local-voice-${Crypto.randomUUID()}`,
        kind: "audio",
        name: `vocal-${Date.now()}.${speechRecording ? "wav" : "m4a"}`,
        uri,
        mimeType: speechRecording ? "audio/wav" : "audio/mp4",
        durationSeconds: Math.max(1, Math.round(elapsedSeconds)),
        status: "local",
        uploadProgress: 0,
        transcript,
        transcriptStatus: transcript ? "ready" : "pending"
      });
    } catch (error) {
      finalizedRef.current = false;
      setFinishing(false);
      AppAlert.alert("Vocal indisponible", error instanceof Error ? error.message : "Le vocal n’a pas pu être envoyé.");
    }
  };

  return (
    <View style={styles.shell} accessibilityLiveRegion="polite">
      <Pressable accessibilityRole="button" accessibilityLabel="Annuler le vocal" onPress={() => void cancel()} style={styles.action}>
        <Ionicons name="trash-outline" size={20} color={theme.danger} />
      </Pressable>
      <View style={styles.recordingContent}>
        <View style={styles.recordingHeader}>
          <View style={styles.liveDot} />
          <Text style={styles.timer}>{formatDuration(elapsedSeconds)}</Text>
          <Text style={styles.status}>{preparing ? "Microphone…" : "Enregistrement"}</Text>
        </View>
        <View style={styles.waveform} accessibilityElementsHidden>
          {waveform.map((height, index) => <View key={`inline-wave-${index}`} style={[styles.waveBar, { height }]} />)}
        </View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Envoyer le vocal" accessibilityState={{ busy: finishing, disabled: preparing }} disabled={preparing || finishing} onPress={() => void send()} style={styles.sendTarget}>
        <LinearGradient colors={gradients.primary} style={styles.sendButton}>
          {preparing || finishing ? <ActivityIndicator size="small" color={colors.white} /> : <Ionicons name="send" size={19} color={colors.white} />}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  shell: { width: "100%", alignSelf: "stretch", minHeight: 58, borderRadius: 22, borderWidth: 1, borderColor: "rgba(107,79,234,0.42)", backgroundColor: theme.surfaceStrong, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 5, overflow: "hidden" },
  action: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  recordingContent: { flex: 1, minWidth: 0, alignSelf: "stretch", justifyContent: "center" },
  recordingHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.danger },
  timer: { color: theme.pageText, fontSize: 12, fontWeight: "900" },
  status: { color: theme.pageTextMuted, fontSize: 12, fontWeight: "800" },
  waveform: { width: "100%", height: 31, flexDirection: "row", alignItems: "center", justifyContent: "space-between", overflow: "hidden" },
  waveBar: { width: 2.5, borderRadius: 2, backgroundColor: theme.orange },
  sendTarget: { width: 50, height: 50, alignItems: "center", justifyContent: "center" },
  sendButton: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" }
});
