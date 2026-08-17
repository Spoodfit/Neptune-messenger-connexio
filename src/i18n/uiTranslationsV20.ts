import type { SupportedLanguage } from "./languages";
import { normalizeUiLanguageCode, type SupportedUiLanguage } from "./uiTranslations";

type TranslationSet = Partial<Record<Exclude<SupportedUiLanguage, "fr">, string>>;

export const UI_TRANSLATIONS_V20: Record<string, TranslationSet> = {
  "Quoi de neuf pour le réseau ?": { en: "What’s new for the network?", es: "¿Qué hay de nuevo para la red?", de: "Was gibt es Neues im Netzwerk?", it: "Cosa c’è di nuovo nella rete?", pt: "O que há de novo na rede?" },
  "Partagez simplement ce que vous voulez…": { en: "Simply share what you want…", es: "Comparte simplemente lo que quieras…", de: "Teile einfach, was du möchtest…", it: "Condividi semplicemente ciò che vuoi…", pt: "Partilhe simplesmente o que quiser…" },
  "Écrire une publication rapide": { en: "Write a quick post", es: "Escribir una publicación rápida", de: "Schnellen Beitrag schreiben", it: "Scrivi un post rapido", pt: "Escrever uma publicação rápida" },
  "Ajouter une photo": { en: "Add a photo", es: "Añadir una foto", de: "Foto hinzufügen", it: "Aggiungi una foto", pt: "Adicionar uma foto" },
  "Ajouter une vidéo": { en: "Add a video", es: "Añadir un vídeo", de: "Video hinzufügen", it: "Aggiungi un video", pt: "Adicionar um vídeo" },
  "Publier maintenant": { en: "Post now", es: "Publicar ahora", de: "Jetzt posten", it: "Pubblica ora", pt: "Publicar agora" },
  "Position ajoutée": { en: "Location added", es: "Ubicación añadida", de: "Standort hinzugefügt", it: "Posizione aggiunta", pt: "Localização adicionada" },
  "Localisation auto": { en: "Auto location", es: "Ubicación automática", de: "Automatischer Standort", it: "Posizione automatica", pt: "Localização automática" },
  "Retirer le média": { en: "Remove media", es: "Quitar contenido", de: "Medium entfernen", it: "Rimuovi contenuto", pt: "Remover conteúdo" },
  "Publication détectée automatiquement": { en: "Post detected automatically", es: "Publicación detectada automáticamente", de: "Beitrag automatisch erkannt", it: "Post rilevato automaticamente", pt: "Publicação detetada automaticamente" },
  "Voir l’évènement": { en: "View event", es: "Ver evento", de: "Event ansehen", it: "Vedi evento", pt: "Ver evento" },
  "Mon univers professionnel": { en: "My professional universe", es: "Mi universo profesional", de: "Meine berufliche Welt", it: "Il mio universo professionale", pt: "O meu universo profissional" },
  "Votre univers professionnel et vos réglages Connexio.": { en: "Your professional universe and Connexio settings.", es: "Tu universo profesional y los ajustes de Connexio.", de: "Deine berufliche Welt und Connexio-Einstellungen.", it: "Il tuo universo professionale e le impostazioni Connexio.", pt: "O seu universo profissional e as definições do Connexio." },
  "Modifier mon profil": { en: "Edit my profile", es: "Editar mi perfil", de: "Mein Profil bearbeiten", it: "Modifica il mio profilo", pt: "Editar o meu perfil" },
  "Prévisualiser mon profil public": { en: "Preview my public profile", es: "Vista previa de mi perfil público", de: "Öffentliches Profil ansehen", it: "Anteprima del mio profilo pubblico", pt: "Pré-visualizar o meu perfil público" },
  "Vue membre": { en: "Member view", es: "Vista de miembro", de: "Mitgliederansicht", it: "Vista membro", pt: "Vista de membro" },
  "Ce que les autres membres voient immédiatement pour savoir comment échanger avec vous.": { en: "What other members immediately see to understand how to connect with you.", es: "Lo que otros miembros ven de inmediato para saber cómo conectar contigo.", de: "Was andere Mitglieder sofort sehen, um zu verstehen, wie sie sich mit dir vernetzen können.", it: "Ciò che gli altri membri vedono subito per capire come entrare in contatto con te.", pt: "O que os outros membros veem de imediato para saber como contactar consigo." },
  "Je peux aider sur": { en: "I can help with", es: "Puedo ayudar con", de: "Ich kann helfen bei", it: "Posso aiutare con", pt: "Posso ajudar com" },
  "Je recherche": { en: "I’m looking for", es: "Busco", de: "Ich suche", it: "Cerco", pt: "Procuro" },
  "Services, produits et activités synchronisés avec Neptune Business.": { en: "Services, products and activities synced with Neptune Business.", es: "Servicios, productos y actividades sincronizados con Neptune Business.", de: "Services, Produkte und Aktivitäten, synchronisiert mit Neptune Business.", it: "Servizi, prodotti e attività sincronizzati con Neptune Business.", pt: "Serviços, produtos e atividades sincronizados com o Neptune Business." },
  "Vos derniers Temps forts dans Connexio.": { en: "Your latest Highlights in Connexio.", es: "Tus últimos momentos en Connexio.", de: "Deine neuesten Highlights in Connexio.", it: "I tuoi ultimi momenti in Connexio.", pt: "Os seus últimos destaques no Connexio." },
  "Le profil reste la vue principale ; les préférences sont regroupées en dessous.": { en: "The profile remains the main view; preferences are grouped below.", es: "El perfil sigue siendo la vista principal; las preferencias están agrupadas abajo.", de: "Das Profil bleibt die Hauptansicht; Einstellungen sind darunter gruppiert.", it: "Il profilo resta la vista principale; le preferenze sono raggruppate sotto.", pt: "O perfil continua a ser a vista principal; as preferências ficam agrupadas abaixo." },
  "Modifier": { en: "Edit", es: "Editar", de: "Bearbeiten", it: "Modifica", pt: "Editar" }
};

export function translateUiTextV20(value: string, language: SupportedLanguage | string): string {
  if (!value || language === "fr") return value;
  const locale = normalizeUiLanguageCode(language, "en");
  if (locale === "fr") return value;
  return UI_TRANSLATIONS_V20[value]?.[locale] ?? UI_TRANSLATIONS_V20[value]?.en ?? value;
}
