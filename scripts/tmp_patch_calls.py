from pathlib import Path

call = Path("app/call/[id].tsx")
text = call.read_text(encoding="utf-8")
text = text.replace(
    'import { LinearGradient } from "expo-linear-gradient";',
    'import { useAudioPlayer } from "expo-audio";\nimport { LinearGradient } from "expo-linear-gradient";'
)
text = text.replace(
    'import { useMemo, useState } from "react";',
    'import { useEffect, useMemo, useState } from "react";'
)
marker = '''  const api = useMemo(
    () => (env.mockMode ? null : new NeptuneCallApi(accessToken)),
    [accessToken]
  );
'''
effect = marker + '''  const ringtonePlayer = useAudioPlayer(
    require("../../assets/audio/connexio-ringtone.mp3")
  );

  useEffect(() => {
    const shouldRing =
      incoming && !session && !unanswered && !declining && !preparing;
    ringtonePlayer.loop = true;
    ringtonePlayer.volume = 0.68;
    if (shouldRing) {
      ringtonePlayer.play();
    } else {
      ringtonePlayer.pause();
      void ringtonePlayer.seekTo(0);
    }
    return () => {
      ringtonePlayer.pause();
      void ringtonePlayer.seekTo(0);
    };
  }, [declining, incoming, preparing, ringtonePlayer, session, unanswered]);
'''
if marker not in text:
    raise RuntimeError("call API marker missing")
text = text.replace(marker, effect)
text = text.replace(
    '''      title={mode === "audio" ? "Préparer l’appel audio" : "Préparer l’appel vidéo"}
      description="Indiquez la raison de l’appel. Elle sera affichée avant que le destinataire accepte ou décline."''',
    '''      title="Pourquoi appelez-vous ?"
      description="Une phrase suffit. Elle s’affichera avant que le destinataire décroche."'''
)
old_input = '''        <VoicePromptInput
value={reason}
onChangeText={setReason}
placeholder="Ex. Valider le lieu de l’afterwork de vendredi"
prompt="Quel est l’objet de votre appel ?"
maxLength={160}
        />'''
new_input = '''        <VoicePromptInput
          value={reason}
          onChangeText={setReason}
          onSubmit={() => void startOutgoingCall()}
          placeholder="Ex. Valider le lieu de l’afterwork de vendredi"
          maxLength={160}
        />'''
if old_input not in text:
    raise RuntimeError("call reason input marker missing")
text = text.replace(old_input, new_input)
text = text.replace(
    '''        busy={preparing}
        onPress={() => void startOutgoingCall()}''',
    '''        busy={preparing}
        disabled={reason.trim().length < 3}
        onPress={() => void startOutgoingCall()}''',
    1
)
call.write_text(text, encoding="utf-8")

room = Path("src/services/calls/callRoom.ts")
text = room.read_text(encoding="utf-8")
if not text.startswith('import { Asset } from "expo-asset";'):
    text = 'import { Asset } from "expo-asset";\n\n' + text
mode_marker = 'export type CallMode = "audio" | "video";\n'
text = text.replace(
    mode_marker,
    mode_marker + '''
const CONNEXIO_RINGTONE_URI = Asset.fromModule(
  require("../../../assets/audio/connexio-ringtone.mp3")
).uri;
''',
    1
)
text = text.replace(
    '    icons: CALL_CONTROL_ICONS\n',
    '    icons: CALL_CONTROL_ICONS,\n    ringtoneUrl: CONNEXIO_RINGTONE_URI\n'
)
text = text.replace(
    '''    let ringbackTimer = null;
    let noAnswerTimer = null;
    let audioContext = null;''',
    '''    let ringtone = null;
    let noAnswerTimer = null;'''
)
start = text.index("    const stopRingback = () => {")
end = text.index("    const fail = (message) => {", start)
ring = '''    const stopRingback = () => {
      if (noAnswerTimer) clearTimeout(noAnswerTimer);
      noAnswerTimer = null;
      if (ringtone) {
        try {
          ringtone.pause();
          ringtone.currentTime = 0;
        } catch {}
      }
    };
    const startRingback = () => {
      if (!cfg.initiator || noAnswerTimer) return;
      try {
        ringtone = ringtone || new Audio(cfg.ringtoneUrl);
        ringtone.loop = true;
        ringtone.preload = 'auto';
        ringtone.volume = .64;
        ringtone.currentTime = 0;
        const playback = ringtone.play();
        if (playback && typeof playback.catch === 'function') {
          playback.catch(() => {});
        }
      } catch {}
      noAnswerTimer = setTimeout(() => {
        stopRingback();
        status.textContent = 'Aucune réponse. Vous pouvez laisser un message vocal.';
        setNetwork('Sans réponse');
        post('unanswered', {
          callId: cfg.callId,
          conversationId: cfg.conversationId,
          reason: cfg.reason
        });
      }, 30000);
    };
'''
text = text[:start] + ring + text[end:]
text = text.replace(
    "      if (audioContext) { try { audioContext.close(); } catch {} }\n",
    ""
)
room.write_text(text, encoding="utf-8")

surface = Path("src/components/CallSurface.native.tsx")
text = surface.read_text(encoding="utf-8")
text = text.replace(
    '''        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback''',
    '''        mediaPlaybackRequiresUserAction={false}
        allowFileAccess
        allowsInlineMediaPlayback'''
)
surface.write_text(text, encoding="utf-8")
