import type { SupportedLanguage } from "./languages";
import { normalizeUiLanguageCode, type SupportedUiLanguage } from "./uiTranslations";

type TranslationSet = Partial<Record<Exclude<SupportedUiLanguage, "fr">, string>>;

export const UI_TRANSLATIONS_V22: Record<string, TranslationSet> = {
  "Ajouter un commentaire facultatif…": { en: "Add an optional comment…", es: "Añade un comentario opcional…", de: "Optionalen Kommentar hinzufügen…", it: "Aggiungi un commento facoltativo…", pt: "Adicionar um comentário opcional…" },
  "Annonce": { en: "Announcements", es: "Anuncios", de: "Ankündigungen", it: "Annunci", pt: "Anúncios" },
  "Auto": { en: "Auto", es: "Auto", de: "Auto", it: "Auto", pt: "Auto" },
  "Avis non enregistré": { en: "Feedback not saved", es: "Opinión no guardada", de: "Bewertung nicht gespeichert", it: "Valutazione non salvata", pt: "Avaliação não guardada" },
  "Catégorie choisie": { en: "Selected category", es: "Categoría elegida", de: "Gewählte Kategorie", it: "Categoria scelta", pt: "Categoria escolhida" },
  "Cet avis est destiné à la réputation du membre dans Neptune Business lorsque la synchronisation backend est activée.": { en: "This feedback contributes to the member’s Neptune Business reputation when backend sync is enabled.", es: "Esta opinión contribuye a la reputación del miembro en Neptune Business cuando la sincronización del backend está activa.", de: "Diese Bewertung trägt zur Neptune-Business-Reputation des Mitglieds bei, sobald die Backend-Synchronisierung aktiv ist.", it: "Questa valutazione contribuisce alla reputazione del membro su Neptune Business quando la sincronizzazione backend è attiva.", pt: "Esta avaliação contribui para a reputação do membro no Neptune Business quando a sincronização de backend estiver ativa." },
  "Comment s’est passé l’échange ?": { en: "How did the conversation go?", es: "¿Cómo fue el intercambio?", de: "Wie ist das Gespräch gelaufen?", it: "Com’è andato lo scambio?", pt: "Como correu a conversa?" },
  "Consulter les annonces Neptune": { en: "View Neptune announcements", es: "Ver los anuncios de Neptune", de: "Neptune-Ankündigungen ansehen", it: "Visualizza gli annunci Neptune", pt: "Ver anúncios Neptune" },
  "contribue à la réputation professionnelle Neptune.": { en: "contributes to the Neptune professional reputation.", es: "contribuye a la reputación profesional de Neptune.", de: "trägt zur professionellen Neptune-Reputation bei.", it: "contribuisce alla reputazione professionale Neptune.", pt: "contribui para a reputação profissional Neptune." },
  "Désépingler": { en: "Unpin", es: "Desfijar", de: "Loslösen", it: "Rimuovi dai fissati", pt: "Desafixar" },
  "Enregistrement…": { en: "Saving…", es: "Guardando…", de: "Speichern…", it: "Salvataggio…", pt: "A guardar…" },
  "Enregistrer la modification": { en: "Save edit", es: "Guardar modificación", de: "Änderung speichern", it: "Salva modifica", pt: "Guardar alteração" },
  "Enregistrer la publication modifiée": { en: "Save edited post", es: "Guardar publicación modificada", de: "Bearbeiteten Beitrag speichern", it: "Salva pubblicazione modificata", pt: "Guardar publicação alterada" },
  "Enregistrer le commentaire modifié": { en: "Save edited comment", es: "Guardar comentario modificado", de: "Bearbeiteten Kommentar speichern", it: "Salva commento modificato", pt: "Guardar comentário alterado" },
  "Envoi…": { en: "Sending…", es: "Enviando…", de: "Senden…", it: "Invio…", pt: "A enviar…" },
  "Envoyer l’avis": { en: "Send feedback", es: "Enviar opinión", de: "Bewertung senden", it: "Invia valutazione", pt: "Enviar avaliação" },
  "Épingler": { en: "Pin", es: "Fijar", de: "Anheften", it: "Fissa", pt: "Fixar" },
  "Excellent échange": { en: "Excellent conversation", es: "Excelente intercambio", de: "Ausgezeichnetes Gespräch", it: "Scambio eccellente", pt: "Excelente conversa" },
  "Format non disponible": { en: "Format unavailable", es: "Formato no disponible", de: "Format nicht verfügbar", it: "Formato non disponibile", pt: "Formato indisponível" },
  "groupe": { en: "group", es: "grupo", de: "Gruppe", it: "gruppo", pt: "grupo" },
  "Le contenu restera marqué « modifié » après l’enregistrement.": { en: "The content will remain marked as edited after saving.", es: "El contenido seguirá marcado como editado después de guardarlo.", de: "Der Inhalt bleibt nach dem Speichern als bearbeitet markiert.", it: "Il contenuto resterà contrassegnato come modificato dopo il salvataggio.", pt: "O conteúdo continuará marcado como editado depois de guardado." },
  "Le libellé « modifié » sera affiché discrètement.": { en: "The edited label will be shown discreetly.", es: "La etiqueta de editado se mostrará discretamente.", de: "Der Hinweis „bearbeitet“ wird dezent angezeigt.", it: "L’etichetta modificato verrà mostrata in modo discreto.", pt: "A indicação editado será apresentada discretamente." },
  "Les conversations épinglées restent en tête.": { en: "Pinned conversations stay at the top.", es: "Las conversaciones fijadas permanecen arriba.", de: "Angeheftete Unterhaltungen bleiben oben.", it: "Le conversazioni fissate restano in alto.", pt: "As conversas fixadas permanecem no topo." },
  "Les groupes apparaissent selon votre statut et vos clubs.": { en: "Groups appear according to your role and clubs.", es: "Los grupos aparecen según tu rol y tus clubes.", de: "Gruppen erscheinen entsprechend deiner Rolle und deinen Clubs.", it: "I gruppi compaiono in base al tuo ruolo e ai tuoi club.", pt: "Os grupos aparecem de acordo com o seu estatuto e os seus clubes." },
  "modifié": { en: "edited", es: "editado", de: "bearbeitet", it: "modificato", pt: "editado" },
  "Modifier la publication": { en: "Edit post", es: "Editar publicación", de: "Beitrag bearbeiten", it: "Modifica pubblicazione", pt: "Editar publicação" },
  "Modifier le commentaire": { en: "Edit comment", es: "Editar comentario", de: "Kommentar bearbeiten", it: "Modifica commento", pt: "Editar comentário" },
  "Modifier le message": { en: "Edit message", es: "Editar mensaje", de: "Nachricht bearbeiten", it: "Modifica messaggio", pt: "Editar mensagem" },
  "Modifier votre commentaire…": { en: "Edit your comment…", es: "Edita tu comentario…", de: "Kommentar bearbeiten…", it: "Modifica il tuo commento…", pt: "Editar o seu comentário…" },
  "Modifier votre message…": { en: "Edit your message…", es: "Edita tu mensaje…", de: "Nachricht bearbeiten…", it: "Modifica il tuo messaggio…", pt: "Editar a sua mensagem…" },
  "Modifier votre publication…": { en: "Edit your post…", es: "Edita tu publicación…", de: "Beitrag bearbeiten…", it: "Modifica la tua pubblicazione…", pt: "Editar a sua publicação…" },
  "OBJET DE L’ÉCHANGE": { en: "CONVERSATION TOPIC", es: "MOTIVO DEL INTERCAMBIO", de: "GESPRÄCHSTHEMA", it: "OGGETTO DELLO SCAMBIO", pt: "TEMA DA CONVERSA" },
  "Ouvrir Annonce": { en: "Open Announcements", es: "Abrir Anuncios", de: "Ankündigungen öffnen", it: "Apri Annunci", pt: "Abrir Anúncios" },
  "Passer": { en: "Skip", es: "Omitir", de: "Überspringen", it: "Salta", pt: "Ignorar" },
  "Passer l’avis": { en: "Skip feedback", es: "Omitir opinión", de: "Bewertung überspringen", it: "Salta valutazione", pt: "Ignorar avaliação" },
  "Qu’est-ce qui pourrait être amélioré ?": { en: "What could be improved?", es: "¿Qué podría mejorar?", de: "Was könnte verbessert werden?", it: "Cosa potrebbe essere migliorato?", pt: "O que poderia ser melhorado?" },
  "Retrouvez rapidement la bonne conversation.": { en: "Quickly find the right conversation.", es: "Encuentra rápidamente la conversación adecuada.", de: "Finde schnell die richtige Unterhaltung.", it: "Trova rapidamente la conversazione giusta.", pt: "Encontre rapidamente a conversa certa." },
  "Revenir à la détection automatique": { en: "Return to automatic detection", es: "Volver a la detección automática", de: "Zur automatischen Erkennung zurückkehren", it: "Torna al rilevamento automatico", pt: "Voltar à deteção automática" },
  "Touchez les étoiles pour noter l’échange": { en: "Tap the stars to rate the conversation", es: "Toca las estrellas para valorar el intercambio", de: "Tippe auf die Sterne, um das Gespräch zu bewerten", it: "Tocca le stelle per valutare lo scambio", pt: "Toque nas estrelas para avaliar a conversa" },
  "Très bon échange": { en: "Very good conversation", es: "Muy buen intercambio", de: "Sehr gutes Gespräch", it: "Ottimo scambio", pt: "Muito boa conversa" },
  "Un échange correct": { en: "A decent conversation", es: "Un intercambio correcto", de: "Ein ordentliches Gespräch", it: "Uno scambio discreto", pt: "Uma conversa razoável" },
  "Utilisez le bouton + pour démarrer une conversation.": { en: "Use the + button to start a conversation.", es: "Usa el botón + para iniciar una conversación.", de: "Nutze die +-Taste, um eine Unterhaltung zu starten.", it: "Usa il pulsante + per iniziare una conversazione.", pt: "Use o botão + para iniciar uma conversa." },
  "visible": { en: "visible", es: "visible", de: "sichtbar", it: "visibile", pt: "visível" },
  "Votre retour sur": { en: "Your feedback about", es: "Tu opinión sobre", de: "Deine Bewertung zu", it: "Il tuo feedback su", pt: "A sua avaliação sobre" }
};

export function translateUiTextV22(value: string, language: SupportedLanguage | string): string {
  if (!value || language === "fr") return value;
  const locale = normalizeUiLanguageCode(language, "en");
  if (locale === "fr") return value;
  return UI_TRANSLATIONS_V22[value]?.[locale] ?? UI_TRANSLATIONS_V22[value]?.en ?? value;
}
