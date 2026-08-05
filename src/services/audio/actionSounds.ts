import { useAudioPlayer } from "expo-audio";
import { useCallback } from "react";

interface ActionAudioPlayer {
  pause: () => void;
  play: () => void;
  seekTo: (seconds: number) => Promise<void> | void;
  volume: number;
}

function replay(player: ActionAudioPlayer, volume: number): void {
  try {
    player.pause();
    void player.seekTo(0);
    player.volume = volume;
    player.play();
  } catch {
    // Un son d'interface ne doit jamais interrompre l'action principale.
  }
}

export function useActionSounds() {
  const callEndPlayer = useAudioPlayer(
    require("../../../assets/audio/connexio_call_end.mp3")
  );
  const messageSentPlayer = useAudioPlayer(
    require("../../../assets/audio/connexio_message_sent.mp3")
  );
  const mentionPlayer = useAudioPlayer(
    require("../../../assets/audio/connexio_mention.mp3")
  );

  const playCallEnd = useCallback(
    () => replay(callEndPlayer, 0.72),
    [callEndPlayer]
  );
  const playMessageSent = useCallback(
    () => replay(messageSentPlayer, 0.58),
    [messageSentPlayer]
  );
  const playMention = useCallback(
    () => replay(mentionPlayer, 0.68),
    [mentionPlayer]
  );

  return { playCallEnd, playMessageSent, playMention };
}
