import type { SupportedLanguage } from "./languages";
import { normalizeUiLanguageCode, type SupportedUiLanguage } from "./uiTranslations";

type TranslationSet = Partial<Record<Exclude<SupportedUiLanguage, "fr">, string>>;

export const UI_TRANSLATIONS_V17B: Record<string, TranslationSet> = {
  "Ajouter une pièce jointe ou un sondage": { en: "Add an attachment or poll", es: "Añadir un archivo adjunto o encuesta", de: "Anhang oder Umfrage hinzufügen", it: "Aggiungi un allegato o un sondaggio", pt: "Adicionar um anexo ou sondagem" },
  "Enregistrer un message vocal": { en: "Record a voice message", es: "Grabar un mensaje de voz", de: "Sprachnachricht aufnehmen", it: "Registra un messaggio vocale", pt: "Gravar uma mensagem de voz" },
  "Envoyer le message": { en: "Send message", es: "Enviar mensaje", de: "Nachricht senden", it: "Invia messaggio", pt: "Enviar mensagem" },
  "Utilisez arobase pour mentionner un membre": { en: "Use @ to mention a member", es: "Usa @ para mencionar a un miembro", de: "Verwenden Sie @, um ein Mitglied zu erwähnen", it: "Usa @ per menzionare un membro", pt: "Use @ para mencionar um membro" },
  "Réponses suggérées": { en: "Suggested replies", es: "Respuestas sugeridas", de: "Vorgeschlagene Antworten", it: "Risposte suggerite", pt: "Respostas sugeridas" },
  "Aucun message. Lancez la discussion.": { en: "No messages yet. Start the conversation.", es: "Aún no hay mensajes. Inicia la conversación.", de: "Noch keine Nachrichten. Starten Sie die Unterhaltung.", it: "Nessun messaggio. Inizia la conversazione.", pt: "Ainda não há mensagens. Inicie a conversa." },
  "Aucun message publié dans cet espace.": { en: "No messages have been posted in this space.", es: "No se han publicado mensajes en este espacio.", de: "In diesem Bereich wurden keine Nachrichten veröffentlicht.", it: "Nessun messaggio pubblicato in questo spazio.", pt: "Nenhuma mensagem publicada neste espaço." },
  "Lecture seule — seuls les responsables autorisés peuvent publier.": { en: "Read-only — only authorized managers can post.", es: "Solo lectura: solo los responsables autorizados pueden publicar.", de: "Nur Lesen — nur autorisierte Verantwortliche können veröffentlichen.", it: "Sola lettura — solo i responsabili autorizzati possono pubblicare.", pt: "Só de leitura — apenas responsáveis autorizados podem publicar." },
  "Retour aux discussions": { en: "Back to conversations", es: "Volver a las conversaciones", de: "Zurück zu den Unterhaltungen", it: "Torna alle conversazioni", pt: "Voltar às conversas" },
  "Revenir aux discussions": { en: "Return to conversations", es: "Volver a las conversaciones", de: "Zu den Unterhaltungen zurückkehren", it: "Torna alle conversazioni", pt: "Voltar às conversas" },
  "Envoi impossible": { en: "Unable to send", es: "No se puede enviar", de: "Senden nicht möglich", it: "Invio impossibile", pt: "Não foi possível enviar" },
  "Envoi du vocal impossible": { en: "Unable to send voice message", es: "No se puede enviar el mensaje de voz", de: "Sprachnachricht konnte nicht gesendet werden", it: "Invio del vocale impossibile", pt: "Não foi possível enviar a mensagem de voz" },
  "Sondage impossible": { en: "Unable to create poll", es: "No se puede crear la encuesta", de: "Umfrage nicht möglich", it: "Sondaggio impossibile", pt: "Não foi possível criar a sondagem" },
  "Vote impossible": { en: "Unable to vote", es: "No se puede votar", de: "Abstimmung nicht möglich", it: "Voto impossibile", pt: "Não foi possível votar" },
  "Pièce jointe indisponible": { en: "Attachment unavailable", es: "Archivo adjunto no disponible", de: "Anhang nicht verfügbar", it: "Allegato non disponibile", pt: "Anexo indisponível" },
  "Jusqu’à 10 contenus et 120 Mo par message. Les médias sont regroupés dans une grille compacte et restent téléchargeables.": { en: "Up to 10 items and 120 MB per message. Media is grouped in a compact grid and remains downloadable.", es: "Hasta 10 elementos y 120 MB por mensaje. Los archivos multimedia se agrupan en una cuadrícula compacta y siguen siendo descargables.", de: "Bis zu 10 Inhalte und 120 MB pro Nachricht. Medien werden in einem kompakten Raster gruppiert und bleiben herunterladbar.", it: "Fino a 10 contenuti e 120 MB per messaggio. I media sono raggruppati in una griglia compatta e restano scaricabili.", pt: "Até 10 conteúdos e 120 MB por mensagem. Os média são agrupados numa grelha compacta e continuam disponíveis para transferência." },
  "Retirer toutes les pièces jointes": { en: "Remove all attachments", es: "Quitar todos los archivos adjuntos", de: "Alle Anhänge entfernen", it: "Rimuovi tutti gli allegati", pt: "Remover todos os anexos" },
  "Mo": { en: "MB", es: "MB", de: "MB", it: "MB", pt: "MB" },
  "Mo /": { en: "MB /", es: "MB /", de: "MB /", it: "MB /", pt: "MB /" },

  "Message vocal": { en: "Voice message", es: "Mensaje de voz", de: "Sprachnachricht", it: "Messaggio vocale", pt: "Mensagem de voz" },
  "Vocal Neptune": { en: "Neptune voice message", es: "Mensaje de voz Neptune", de: "Neptune-Sprachnachricht", it: "Vocale Neptune", pt: "Mensagem de voz Neptune" },
  "Lire dans Connexio": { en: "Play in Connexio", es: "Reproducir en Connexio", de: "In Connexio abspielen", it: "Riproduci in Connexio", pt: "Reproduzir no Connexio" },
  "Lire le Temps fort vocal": { en: "Play voice Highlight", es: "Reproducir Momento de voz", de: "Sprach-Highlight abspielen", it: "Riproduci il Momento vocale", pt: "Reproduzir Destaque de voz" },
  "Temps fort vocal": { en: "Voice Highlight", es: "Momento de voz", de: "Sprach-Highlight", it: "Momento vocale", pt: "Destaque de voz" },
  "Afficher la transcription": { en: "Show transcript", es: "Mostrar transcripción", de: "Transkript anzeigen", it: "Mostra trascrizione", pt: "Mostrar transcrição" },
  "Masquer la transcription": { en: "Hide transcript", es: "Ocultar transcripción", de: "Transkript ausblenden", it: "Nascondi trascrizione", pt: "Ocultar transcrição" },
  "Transcription en cours…": { en: "Transcribing…", es: "Transcribiendo…", de: "Transkription läuft…", it: "Trascrizione in corso…", pt: "A transcrever…" },
  "Préparation du vocal…": { en: "Preparing voice message…", es: "Preparando mensaje de voz…", de: "Sprachnachricht wird vorbereitet…", it: "Preparazione vocale…", pt: "A preparar mensagem de voz…" },
  "Enregistrement": { en: "Recording", es: "Grabación", de: "Aufnahme", it: "Registrazione", pt: "Gravação" },
  "Enregistrement en cours": { en: "Recording in progress", es: "Grabación en curso", de: "Aufnahme läuft", it: "Registrazione in corso", pt: "Gravação em curso" },
  "Microphone…": { en: "Microphone…", es: "Micrófono…", de: "Mikrofon…", it: "Microfono…", pt: "Microfone…" },
  "Appuyez pour commencer": { en: "Tap to start", es: "Toca para empezar", de: "Tippen zum Starten", it: "Tocca per iniziare", pt: "Toque para começar" },
  "Annuler le vocal": { en: "Cancel voice message", es: "Cancelar mensaje de voz", de: "Sprachnachricht abbrechen", it: "Annulla vocale", pt: "Cancelar mensagem de voz" },
  "Envoyer le vocal": { en: "Send voice message", es: "Enviar mensaje de voz", de: "Sprachnachricht senden", it: "Invia vocale", pt: "Enviar mensagem de voz" },
  "Fermer l’enregistreur vocal": { en: "Close voice recorder", es: "Cerrar grabadora de voz", de: "Sprachrekorder schließen", it: "Chiudi registratore vocale", pt: "Fechar gravador de voz" },
  "Microphone indisponible": { en: "Microphone unavailable", es: "Micrófono no disponible", de: "Mikrofon nicht verfügbar", it: "Microfono non disponibile", pt: "Microfone indisponível" },
  "Microphone interrompu": { en: "Microphone interrupted", es: "Micrófono interrumpido", de: "Mikrofon unterbrochen", it: "Microfono interrotto", pt: "Microfone interrompido" },
  "Microphone non compatible": { en: "Microphone not supported", es: "Micrófono no compatible", de: "Mikrofon nicht unterstützt", it: "Microfono non supportato", pt: "Microfone não suportado" },
  "Vocal indisponible": { en: "Voice message unavailable", es: "Mensaje de voz no disponible", de: "Sprachnachricht nicht verfügbar", it: "Vocale non disponibile", pt: "Mensagem de voz indisponível" },
  "Ce message vocal n’est plus accessible.": { en: "This voice message is no longer available.", es: "Este mensaje de voz ya no está disponible.", de: "Diese Sprachnachricht ist nicht mehr verfügbar.", it: "Questo messaggio vocale non è più disponibile.", pt: "Esta mensagem de voz já não está disponível." },
  "Le message vocal n’a pas pu être récupéré depuis le microphone.": { en: "The voice message could not be captured from the microphone.", es: "No se pudo capturar el mensaje de voz desde el micrófono.", de: "Die Sprachnachricht konnte nicht vom Mikrofon aufgenommen werden.", it: "Non è stato possibile acquisire il messaggio vocale dal microfono.", pt: "Não foi possível captar a mensagem de voz pelo microfone." },
  "Ce navigateur ne prend pas en charge l’enregistrement vocal intégré.": { en: "This browser does not support built-in voice recording.", es: "Este navegador no admite la grabación de voz integrada.", de: "Dieser Browser unterstützt die integrierte Sprachaufnahme nicht.", it: "Questo browser non supporta la registrazione vocale integrata.", pt: "Este navegador não suporta gravação de voz integrada." },
  "L’enregistrement vocal a été interrompu par le navigateur.": { en: "Voice recording was interrupted by the browser.", es: "La grabación de voz fue interrumpida por el navegador.", de: "Die Sprachaufnahme wurde vom Browser unterbrochen.", it: "La registrazione vocale è stata interrotta dal browser.", pt: "A gravação de voz foi interrompida pelo navegador." },
  "Enregistrez puis envoyez-le comme une pièce jointe sécurisée.": { en: "Record it, then send it as a secure attachment.", es: "Grábalo y envíalo como archivo adjunto seguro.", de: "Nehmen Sie es auf und senden Sie es als sicheren Anhang.", it: "Registralo e invialo come allegato sicuro.", pt: "Grave e envie como anexo seguro." },

  "Photo indisponible": { en: "Photo unavailable", es: "Foto no disponible", de: "Foto nicht verfügbar", it: "Foto non disponibile", pt: "Foto indisponível" },
  "Vidéo indisponible": { en: "Video unavailable", es: "Vídeo no disponible", de: "Video nicht verfügbar", it: "Video non disponibile", pt: "Vídeo indisponível" },
  "Média indisponible": { en: "Media unavailable", es: "Contenido multimedia no disponible", de: "Medium nicht verfügbar", it: "Media non disponibile", pt: "Conteúdo multimédia indisponível" },
  "Ce média n’est plus accessible.": { en: "This media is no longer available.", es: "Este contenido multimedia ya no está disponible.", de: "Dieses Medium ist nicht mehr verfügbar.", it: "Questo media non è più disponibile.", pt: "Este conteúdo multimédia já não está disponível." },
  "Ce fichier n’est plus accessible.": { en: "This file is no longer available.", es: "Este archivo ya no está disponible.", de: "Diese Datei ist nicht mehr verfügbar.", it: "Questo file non è più disponibile.", pt: "Este ficheiro já não está disponível." },
  "Le contenu n’est plus accessible.": { en: "The content is no longer available.", es: "El contenido ya no está disponible.", de: "Der Inhalt ist nicht mehr verfügbar.", it: "Il contenuto non è più disponibile.", pt: "O conteúdo já não está disponível." },
  "Aucune application ne peut lire ce média.": { en: "No app can play this media.", es: "Ninguna aplicación puede reproducir este contenido.", de: "Keine App kann dieses Medium wiedergeben.", it: "Nessuna app può riprodurre questo media.", pt: "Nenhuma aplicação consegue reproduzir este conteúdo." },
  "Aucune application ne peut ouvrir ce contenu.": { en: "No app can open this content.", es: "Ninguna aplicación puede abrir este contenido.", de: "Keine App kann diesen Inhalt öffnen.", it: "Nessuna app può aprire questo contenuto.", pt: "Nenhuma aplicação consegue abrir este conteúdo." },
  "Ouverture impossible": { en: "Unable to open", es: "No se puede abrir", de: "Öffnen nicht möglich", it: "Apertura impossibile", pt: "Não foi possível abrir" },
  "Ouvrir la photo": { en: "Open photo", es: "Abrir foto", de: "Foto öffnen", it: "Apri foto", pt: "Abrir foto" },
  "Ouvrir la vidéo en plein écran": { en: "Open video full screen", es: "Abrir vídeo a pantalla completa", de: "Video im Vollbild öffnen", it: "Apri video a schermo intero", pt: "Abrir vídeo em ecrã inteiro" },
  "Aperçu sécurisé dans Connexio": { en: "Secure preview in Connexio", es: "Vista previa segura en Connexio", de: "Sichere Vorschau in Connexio", it: "Anteprima sicura in Connexio", pt: "Pré-visualização segura no Connexio" },
  "Fermer l’aperçu": { en: "Close preview", es: "Cerrar vista previa", de: "Vorschau schließen", it: "Chiudi anteprima", pt: "Fechar pré-visualização" },

  "Votre carnet reste sur votre téléphone": { en: "Your address book stays on your phone", es: "Tu agenda permanece en tu teléfono", de: "Ihr Adressbuch bleibt auf Ihrem Telefon", it: "La rubrica resta sul tuo telefono", pt: "A sua agenda permanece no telefone" },
  "Seuls les contacts choisis sont utilisés. Aucun import automatique du carnet.": { en: "Only selected contacts are used. Your address book is never imported automatically.", es: "Solo se usan los contactos seleccionados. La agenda nunca se importa automáticamente.", de: "Nur ausgewählte Kontakte werden verwendet. Das Adressbuch wird nie automatisch importiert.", it: "Vengono usati solo i contatti selezionati. La rubrica non viene mai importata automaticamente.", pt: "Apenas os contactos selecionados são utilizados. A agenda nunca é importada automaticamente." },
  "Préparer l’invitation SMS": { en: "Prepare SMS invitation", es: "Preparar invitación por SMS", de: "SMS-Einladung vorbereiten", it: "Prepara invito SMS", pt: "Preparar convite por SMS" },
  "Envoyer la recommandation": { en: "Send recommendation", es: "Enviar recomendación", de: "Empfehlung senden", it: "Invia raccomandazione", pt: "Enviar recomendação" },
  "Choisir une autre personne": { en: "Choose another person", es: "Elegir otra persona", de: "Andere Person auswählen", it: "Scegli un’altra persona", pt: "Escolher outra pessoa" },
  "Ajouter un autre contact": { en: "Add another contact", es: "Añadir otro contacto", de: "Weiteren Kontakt hinzufügen", it: "Aggiungi un altro contatto", pt: "Adicionar outro contacto" },
  "Ouvrir les réglages de Connexio": { en: "Open Connexio settings", es: "Abrir ajustes de Connexio", de: "Connexio-Einstellungen öffnen", it: "Apri impostazioni Connexio", pt: "Abrir definições do Connexio" },
  "La sélection de contacts du téléphone est disponible dans l’application Android et iOS.": { en: "Phone contact selection is available in the Android and iOS app.", es: "La selección de contactos del teléfono está disponible en la aplicación Android e iOS.", de: "Die Kontaktauswahl des Telefons ist in der Android- und iOS-App verfügbar.", it: "La selezione dei contatti del telefono è disponibile nell’app Android e iOS.", pt: "A seleção de contactos do telefone está disponível na aplicação Android e iOS." },
  "Connexio n’a pas pu ouvrir le sélecteur de contacts. Vérifiez l’autorisation Contacts.": { en: "Connexio could not open the contact picker. Check the Contacts permission.", es: "Connexio no pudo abrir el selector de contactos. Comprueba el permiso de Contactos.", de: "Connexio konnte die Kontaktauswahl nicht öffnen. Prüfen Sie die Kontakte-Berechtigung.", it: "Connexio non ha potuto aprire il selettore contatti. Controlla il permesso Contatti.", pt: "O Connexio não conseguiu abrir o seletor de contactos. Verifique a permissão Contactos." },
  "Sélectionnez au moins un contact disposant d’un numéro de téléphone.": { en: "Select at least one contact with a phone number.", es: "Selecciona al menos un contacto con número de teléfono.", de: "Wählen Sie mindestens einen Kontakt mit Telefonnummer aus.", it: "Seleziona almeno un contatto con un numero di telefono.", pt: "Selecione pelo menos um contacto com número de telefone." },
  "L’application SMS n’a pas pu être ouverte. Vérifiez qu’une application de messagerie SMS est disponible.": { en: "The SMS app could not be opened. Check that an SMS messaging app is available.", es: "No se pudo abrir la aplicación SMS. Comprueba que haya una aplicación de mensajería SMS disponible.", de: "Die SMS-App konnte nicht geöffnet werden. Prüfen Sie, ob eine SMS-App verfügbar ist.", it: "Non è stato possibile aprire l’app SMS. Verifica che sia disponibile un’app per gli SMS.", pt: "Não foi possível abrir a aplicação SMS. Verifique se existe uma aplicação de SMS disponível." },
  "Connexio prépare le SMS avec le destinataire et le texte déjà renseignés. Android/iOS demandent ensuite la validation finale dans l’application SMS du téléphone.": { en: "Connexio prepares the SMS with the recipient and text already filled in. Android/iOS then asks for final confirmation in the phone’s SMS app.", es: "Connexio prepara el SMS con el destinatario y el texto ya completados. Android/iOS solicita después la confirmación final en la aplicación SMS del teléfono.", de: "Connexio bereitet die SMS mit Empfänger und Text vor. Android/iOS verlangt anschließend die endgültige Bestätigung in der SMS-App des Telefons.", it: "Connexio prepara l’SMS con destinatario e testo già compilati. Android/iOS richiede poi la conferma finale nell’app SMS del telefono.", pt: "O Connexio prepara o SMS com o destinatário e o texto preenchidos. Android/iOS pede depois a confirmação final na aplicação SMS do telefone." },

  "Automatisations indisponibles": { en: "Automations unavailable", es: "Automatizaciones no disponibles", de: "Automatisierungen nicht verfügbar", it: "Automazioni non disponibili", pt: "Automatizações indisponíveis" },
  "Automatisations non autorisées": { en: "Automations not allowed", es: "Automatizaciones no autorizadas", de: "Automatisierungen nicht erlaubt", it: "Automazioni non autorizzate", pt: "Automatizações não autorizadas" },
  "Automatisations partagées": { en: "Shared automations", es: "Automatizaciones compartidas", de: "Geteilte Automatisierungen", it: "Automazioni condivise", pt: "Automatizações partilhadas" },
  "Nouvelle automatisation": { en: "New automation", es: "Nueva automatización", de: "Neue Automatisierung", it: "Nuova automazione", pt: "Nova automatização" },
  "Modifier l’automatisation": { en: "Edit automation", es: "Editar automatización", de: "Automatisierung bearbeiten", it: "Modifica automazione", pt: "Editar automatização" },
  "Nom de l’automatisation": { en: "Automation name", es: "Nombre de la automatización", de: "Name der Automatisierung", it: "Nome dell’automazione", pt: "Nome da automatização" },
  "Ex. Rappel atelier chaque lundi": { en: "E.g. Workshop reminder every Monday", es: "Ej. Recordatorio del taller cada lunes", de: "Z. B. Workshop-Erinnerung jeden Montag", it: "Es. Promemoria workshop ogni lunedì", pt: "Ex. Lembrete do workshop todas as segundas" },
  "Écrivez le message qui sera envoyé…": { en: "Write the message that will be sent…", es: "Escribe el mensaje que se enviará…", de: "Schreiben Sie die Nachricht, die gesendet wird…", it: "Scrivi il messaggio che verrà inviato…", pt: "Escreva a mensagem que será enviada…" },
  "Récurrence": { en: "Recurrence", es: "Recurrencia", de: "Wiederholung", it: "Ricorrenza", pt: "Recorrência" },
  "Une fois": { en: "Once", es: "Una vez", de: "Einmal", it: "Una volta", pt: "Uma vez" },
  "Un envoi unique": { en: "One-time send", es: "Envío único", de: "Einmaliger Versand", it: "Invio unico", pt: "Envio único" },
  "Chaque jour": { en: "Every day", es: "Cada día", de: "Jeden Tag", it: "Ogni giorno", pt: "Todos os dias" },
  "Chaque semaine": { en: "Every week", es: "Cada semana", de: "Jede Woche", it: "Ogni settimana", pt: "Todas as semanas" },
  "Chaque mois": { en: "Every month", es: "Cada mes", de: "Jeden Monat", it: "Ogni mese", pt: "Todos os meses" },
  "À la même heure": { en: "At the same time", es: "A la misma hora", de: "Zur gleichen Uhrzeit", it: "Alla stessa ora", pt: "À mesma hora" },
  "Le même jour": { en: "On the same day", es: "El mismo día", de: "Am selben Tag", it: "Lo stesso giorno", pt: "No mesmo dia" },
  "À la même date": { en: "On the same date", es: "En la misma fecha", de: "Am selben Datum", it: "Alla stessa data", pt: "Na mesma data" },
  "Activer dès l’enregistrement": { en: "Enable when saved", es: "Activar al guardar", de: "Beim Speichern aktivieren", it: "Attiva al salvataggio", pt: "Ativar ao guardar" },
  "Activer l’automatisation": { en: "Enable automation", es: "Activar automatización", de: "Automatisierung aktivieren", it: "Attiva automazione", pt: "Ativar automatização" },
  "Vous pourrez la mettre en pause à tout moment.": { en: "You can pause it at any time.", es: "Puedes pausarla en cualquier momento.", de: "Sie können sie jederzeit pausieren.", it: "Potrai metterla in pausa in qualsiasi momento.", pt: "Pode colocá-la em pausa a qualquer momento." },
  "Créez le premier envoi automatique de ce groupe.": { en: "Create this group’s first automated send.", es: "Crea el primer envío automático de este grupo.", de: "Erstellen Sie den ersten automatisierten Versand dieser Gruppe.", it: "Crea il primo invio automatico di questo gruppo.", pt: "Crie o primeiro envio automático deste grupo." },
  "Lecture seule · gestion réservée au créateur ou aux Visionnaires": { en: "Read-only · management restricted to the creator or Visionnaires", es: "Solo lectura · gestión reservada al creador o a los Visionnaires", de: "Nur Lesen · Verwaltung nur durch Ersteller oder Visionnaires", it: "Sola lettura · gestione riservata al creatore o ai Visionnaires", pt: "Só de leitura · gestão reservada ao criador ou aos Visionnaires" },
  "Retour au groupe": { en: "Back to group", es: "Volver al grupo", de: "Zurück zur Gruppe", it: "Torna al gruppo", pt: "Voltar ao grupo" },
  "Heure": { en: "Time", es: "Hora", de: "Uhrzeit", it: "Ora", pt: "Hora" },
  "Dans 10 min": { en: "In 10 min", es: "En 10 min", de: "In 10 Min.", it: "Tra 10 min", pt: "Daqui a 10 min" },
  "Dans 1 heure": { en: "In 1 hour", es: "En 1 hora", de: "In 1 Stunde", it: "Tra 1 ora", pt: "Daqui a 1 hora" },
  "Demain à 9 h": { en: "Tomorrow at 9 AM", es: "Mañana a las 9", de: "Morgen um 9 Uhr", it: "Domani alle 9", pt: "Amanhã às 9" },
  "Lundi à 9 h": { en: "Monday at 9 AM", es: "Lunes a las 9", de: "Montag um 9 Uhr", it: "Lunedì alle 9", pt: "Segunda-feira às 9" },

  "Impossible de charger les discussions.": { en: "Unable to load conversations.", es: "No se pueden cargar las conversaciones.", de: "Unterhaltungen konnten nicht geladen werden.", it: "Impossibile caricare le conversazioni.", pt: "Não foi possível carregar as conversas." },
  "Impossible de charger les messages.": { en: "Unable to load messages.", es: "No se pueden cargar los mensajes.", de: "Nachrichten konnten nicht geladen werden.", it: "Impossibile caricare i messaggi.", pt: "Não foi possível carregar as mensagens." },
  "Impossible de charger les messages précédents.": { en: "Unable to load earlier messages.", es: "No se pueden cargar los mensajes anteriores.", de: "Frühere Nachrichten konnten nicht geladen werden.", it: "Impossibile caricare i messaggi precedenti.", pt: "Não foi possível carregar as mensagens anteriores." },
  "Le stockage local des messages est indisponible.": { en: "Local message storage is unavailable.", es: "El almacenamiento local de mensajes no está disponible.", de: "Lokaler Nachrichtenspeicher ist nicht verfügbar.", it: "L’archiviazione locale dei messaggi non è disponibile.", pt: "O armazenamento local de mensagens está indisponível." },
  "Impossible d’enregistrer le message sur cet appareil.": { en: "Unable to save the message on this device.", es: "No se puede guardar el mensaje en este dispositivo.", de: "Die Nachricht konnte auf diesem Gerät nicht gespeichert werden.", it: "Impossibile salvare il messaggio su questo dispositivo.", pt: "Não foi possível guardar a mensagem neste dispositivo." },
  "Un message n’a pas été envoyé.": { en: "A message was not sent.", es: "No se envió un mensaje.", de: "Eine Nachricht wurde nicht gesendet.", it: "Un messaggio non è stato inviato.", pt: "Uma mensagem não foi enviada." },
  "Le message dépasse la limite de 4 000 caractères.": { en: "The message exceeds the 4,000-character limit.", es: "El mensaje supera el límite de 4.000 caracteres.", de: "Die Nachricht überschreitet das Limit von 4.000 Zeichen.", it: "Il messaggio supera il limite di 4.000 caratteri.", pt: "A mensagem excede o limite de 4 000 caracteres." },
  "Vous n’êtes pas autorisé à publier dans cette conversation.": { en: "You are not allowed to post in this conversation.", es: "No tienes permiso para publicar en esta conversación.", de: "Sie dürfen in dieser Unterhaltung nicht veröffentlichen.", it: "Non sei autorizzato a pubblicare in questa conversazione.", pt: "Não tem autorização para publicar nesta conversa." },

  "Signalement enregistré": { en: "Report recorded", es: "Denuncia registrada", de: "Meldung gespeichert", it: "Segnalazione registrata", pt: "Denúncia registada" },
  "Signalement transmis": { en: "Report sent", es: "Denuncia enviada", de: "Meldung gesendet", it: "Segnalazione inviata", pt: "Denúncia enviada" },
  "Signalement impossible": { en: "Unable to report", es: "No se puede denunciar", de: "Meldung nicht möglich", it: "Segnalazione impossibile", pt: "Não foi possível denunciar" },
  "La modération Neptune examinera ce contenu.": { en: "Neptune moderation will review this content.", es: "La moderación de Neptune revisará este contenido.", de: "Die Neptune-Moderation wird diesen Inhalt prüfen.", it: "La moderazione Neptune esaminerà questo contenuto.", pt: "A moderação Neptune irá analisar este conteúdo." },
  "La modération Neptune va examiner ce profil.": { en: "Neptune moderation will review this profile.", es: "La moderación de Neptune revisará este perfil.", de: "Die Neptune-Moderation wird dieses Profil prüfen.", it: "La moderazione Neptune esaminerà questo profilo.", pt: "A moderação Neptune irá analisar este perfil." },
  "Le signalement est simulé en démonstration.": { en: "Reporting is simulated in demo mode.", es: "La denuncia se simula en el modo de demostración.", de: "Die Meldung wird im Demo-Modus simuliert.", it: "La segnalazione è simulata in modalità demo.", pt: "A denúncia é simulada no modo de demonstração." },
  "Le signalement sera envoyé à Neptune.": { en: "The report will be sent to Neptune.", es: "La denuncia se enviará a Neptune.", de: "Die Meldung wird an Neptune gesendet.", it: "La segnalazione verrà inviata a Neptune.", pt: "A denúncia será enviada à Neptune." }
};

function splitPadding(value: string): { prefix: string; core: string; suffix: string } {
  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  return { prefix: leading, core: value.slice(leading.length, value.length - trailing.length), suffix: trailing };
}

export function translateUiTextV17B(value: string, language: SupportedLanguage | string): string {
  if (!value || language === "fr") return value;
  const locale = normalizeUiLanguageCode(language, "en");
  if (locale === "fr") return value;
  const { prefix, core, suffix } = splitPadding(value);
  const translation = UI_TRANSLATIONS_V17B[core]?.[locale] ?? UI_TRANSLATIONS_V17B[core]?.en;
  return translation ? `${prefix}${translation}${suffix}` : value;
}
