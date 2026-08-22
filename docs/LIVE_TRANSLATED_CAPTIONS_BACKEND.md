# Connexio — sous-titrage traduit en direct

Ce contrat complète `MESSAGE_TRANSLATION_BACKEND.md` pour les appels vidéo Connexio.

## Objectif

Chaque participant parle normalement dans sa langue. Connexio envoie de courts fragments audio de son microphone au backend uniquement lorsque le sous-titrage est activé. Le backend transcrit la parole, détecte la langue source, traduit vers la langue cible de chaque lecteur et renvoie des sous-titres en temps réel.

Le flux WebRTC audio/vidéo reste indépendant : une panne de transcription ou traduction ne doit jamais interrompre l'appel.

## Création / acceptation d'appel

Le client envoie :

```json
{
  "captions_requested": true,
  "caption_target_language": "fr"
}
```

La réponse de session peut annoncer :

```json
{
  "captioning_enabled": true,
  "caption_target_language": "fr",
  "captions_default_on": false,
  "caption_audio_chunk_ms": 1200,
  "caption_max_audio_base64_length": 524288
}
```

Règles :
- `captioning_enabled` doit être `true` uniquement si le backend est réellement prêt à traiter l'audio.
- Si absent ou `false`, le client masque le contrôle CC.
- `captions_default_on` peut refléter une préférence utilisateur persistée côté serveur. Par défaut recommandé : `false` tant que le consentement et la politique de confidentialité ne sont pas validés.
- `caption_target_language` utilise un code BCP-47 ou un code de base (`fr`, `en`, `es`, etc.).
- `caption_audio_chunk_ms` : 800 à 3000 ms.
- `caption_max_audio_base64_length` : 64 000 à 1 000 000 caractères.

## Socket.IO

La couche de sous-titrage utilise une connexion Socket.IO authentifiée séparée du canal de signalisation WebRTC, avec le même `callToken` et le même `callId`.

### Client -> serveur : `call:captions:join`

```json
{
  "callId": "call-123",
  "conversationId": "thread-123",
  "displayName": "Alice",
  "targetLanguage": "fr",
  "enabled": true
}
```

Le serveur doit vérifier :
- token valide ;
- utilisateur membre de l'appel ;
- `callId` correspondant exactement au token ;
- appel encore actif ;
- `conversationId` cohérent avec la session.

Réponse recommandée : `call:captions:ready`.

### Client -> serveur : `call:captions:preference`

```json
{
  "callId": "call-123",
  "enabled": true,
  "targetLanguage": "fr"
}
```

Lorsque `enabled` devient `false`, le backend doit arrêter le traitement et la diffusion des sous-titres pour cet utilisateur.

### Client -> serveur : `call:caption-audio`

```json
{
  "callId": "call-123",
  "conversationId": "thread-123",
  "sequence": 42,
  "mimeType": "audio/webm;codecs=opus",
  "audioBase64": "...",
  "targetLanguage": "fr"
}
```

Contrôles serveur obligatoires :
- authentification et appartenance à l'appel ;
- `callId` strictement égal à celui du token ;
- taille <= limite annoncée ;
- MIME allowlist (`audio/webm`, `audio/webm;codecs=opus`, `audio/mp4`, `audio/mp4;codecs=mp4a.40.2`) ;
- fréquence limitée selon `caption_audio_chunk_ms` ;
- `sequence` monotone par participant ;
- rejet des fragments après fin d'appel ;
- quota anti-abus par appel et par utilisateur.

## Pipeline recommandé

```text
fragment audio
-> validation
-> transcription streaming / quasi-streaming
-> détection langue source
-> texte original éphémère
-> traduction vers les langues cibles actives
-> cache très court par segment + langue
-> diffusion Socket.IO
-> destruction audio/transcript selon politique de rétention
```

Ne jamais traduire une fois par utilisateur si plusieurs participants utilisent la même langue : traduire une fois par `segmentId + targetLanguage`, puis diffuser le résultat aux destinataires concernés.

## Serveur -> client : `call:caption`

```json
{
  "callId": "call-123",
  "segmentId": "seg-987",
  "speakerId": "user-44",
  "speakerName": "Alice",
  "sourceLanguage": "en",
  "targetLanguage": "fr",
  "originalText": "Can we move the meeting to three?",
  "text": "Peut-on déplacer la réunion à quinze heures ?",
  "final": true,
  "sequence": 42
}
```

Le client :
- ignore tout événement dont `callId` ne correspond pas à l'appel affiché ;
- affiche `speakerName` ;
- affiche `text` ;
- montre « Traduit de … » si langue source et cible diffèrent ;
- retire automatiquement le sous-titre après quelques secondes ;
- n'enregistre rien localement.

Pour les résultats intermédiaires, `final: false` est accepté.

## Serveur -> client : indisponibilité

Événement : `call:captions:unavailable`

Le contrôle CC devient indisponible, mais l'appel continue normalement.

## Confidentialité et conformité

Avant activation en production :
- mettre à jour la politique de confidentialité Connexio pour mentionner la transcription et la traduction des communications vocales ;
- déclarer le fournisseur STT/traduction comme sous-traitant le cas échéant ;
- disposer d'un DPA approprié ;
- documenter région de traitement / transferts éventuels ;
- ne jamais inclure audio ou transcript complet dans les logs applicatifs ;
- ne pas conserver les fragments audio par défaut ;
- si une conservation est nécessaire, la rendre explicite, limitée et documentée ;
- ne jamais exposer une clé fournisseur dans l'application mobile.

Le comportement par défaut recommandé est : sous-titres disponibles mais activés par l'utilisateur, sauf préférence explicite enregistrée auparavant.

## Critères d'acceptation backend

1. Un participant anglais et un participant français peuvent parler chacun dans leur langue et lire les sous-titres dans leur langue cible.
2. Désactiver CC arrête immédiatement l'envoi/traitement des nouveaux fragments pour l'utilisateur.
3. Un message `call:caption` d'un autre `callId` est rejeté ou ignoré.
4. Une panne STT/traduction n'interrompt pas WebRTC.
5. Aucun secret fournisseur n'est présent dans le bundle mobile.
6. Les fragments dépassant la limite, MIME interdits ou trop fréquents sont rejetés.
7. La fin d'appel ferme les workers/streams de transcription et purge l'état éphémère.
8. Les langues de plusieurs participants sont mutualisées pour éviter les traductions dupliquées.
