# Connexio 1.0.0 — Release Candidate

Cette branche vise une candidate technique installable sur TestFlight et sur la piste interne Google Play.

## Validations automatiques obligatoires

- installation strictement reproductible avec `npm ci` ;
- audit des dépendances de production ;
- TypeScript et tests de domaine ;
- compatibilité des dépendances Expo ;
- configuration store sans mode démonstration ;
- build web et audit responsive ;
- audit des parcours produit ;
- prébuild Android et iOS sans modification manuelle ;
- absence de scripts, fragments Base64 et workflows de staging temporaires ;
- contrats de traduction et de sous-titrage testés sans fournisseur secret embarqué dans l'application.

## V15 — périmètre gelé avant fusion

La passe V15 est considérée fonctionnellement gelée. Le candidat final doit conserver :

- avatars circulaires et anneaux de statut cohérents sur les surfaces principales ;
- navigation tactile, actions rapides et swipes sans collision avec les gestes locaux ;
- hub Appels, programmation, objet obligatoire et rappels ;
- sélection explicite d'un contact appareil sans écriture dans le carnet ;
- modes Système, Sombre et Clair persistants ;
- icônes natives complètes, dont les variantes iOS et l'icône de notification Android ;
- safe-zone de l'icône adaptive Android contrôlée automatiquement ;
- aucune ressource ou workflow temporaire de diagnostic dans l'arbre final.

Aucune nouvelle fonctionnalité ne doit être ajoutée avant fusion. Seules les corrections nécessaires pour obtenir CI, responsive-audit et Product Audit verts sont autorisées.

## Validations externes obligatoires avant soumission publique

- environnement Neptune de préproduction réel ;
- APNs et FCM sur appareils physiques ;
- TURN et appels Wi-Fi/4G/5G ;
- traduction de messages réelle sur plusieurs langues ;
- sous-titres traduits en visio sur iOS, Android et web, y compris micro coupé/réactivé et perte réseau ;
- fournisseurs de traduction/transcription, traitement et conservation documentés avant activation des feature flags ;
- TestFlight et piste interne Play ;
- VoiceOver et TalkBack ;
- politique de confidentialité, assistance et suppression de compte publiées ;
- fiches App Privacy et Data Safety renseignées avec les données réellement traitées.

Une CI verte qualifie le code comme candidate technique. Elle ne remplace pas les contrôles des comptes Apple/Google, du backend, des fournisseurs tiers et des appareils physiques.
