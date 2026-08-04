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
- absence de scripts, fragments Base64 et workflows de staging temporaires.

## Validations externes obligatoires avant soumission publique

- environnement Neptune de préproduction réel ;
- APNs et FCM sur appareils physiques ;
- TURN et appels Wi-Fi/4G/5G ;
- TestFlight et piste interne Play ;
- VoiceOver et TalkBack ;
- politique de confidentialité, assistance et suppression de compte publiées ;
- fiches App Privacy et Data Safety renseignées avec les données réellement traitées.

Une CI verte qualifie le code comme candidate technique. Elle ne remplace pas les contrôles des comptes Apple/Google, du backend et des appareils physiques.
