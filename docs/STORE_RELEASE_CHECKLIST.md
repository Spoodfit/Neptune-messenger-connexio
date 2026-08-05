# Connexio — contrôle de publication stores

## Validation RC1

- Validation technique initiale exécutée le 5 août 2026.
- Socle natif validé à partir du commit `8d9597119b49b97d0e32866cb5904609fd41bb1c`.
- Les contrôles GitHub indépendants doivent rester verts sur le dernier commit de la branche avant soumission.

## Contrôles automatisés

- Expo SDK 57, Android API 36 et image EAS `sdk-57`.
- Image iOS EAS `sdk-57`, compatible Xcode 26 et SDK iOS 26.
- Prébuild iOS et Android reproductible.
- Manifest de confidentialité iOS présent et syntaxiquement valide.
- Permissions sensibles documentées.
- Politique de confidentialité, assistance et suppression de compte obligatoires.
- Conditions d’utilisation HTTPS et acceptation explicite avant accès aux fonctions de contenu utilisateur.
- Signalement de contenu et blocage des utilisateurs accessibles dans l’application.
- Sons natifs de notification et de mention embarqués.
- APK de contrôle ciblant l’API 36 et vérifié pour l’alignement 16 Ko.
- Audit visuel 360×800, 390×844 et 393×852.
- Zones tactiles minimales 48×48, champs à 16 px, textes courts ≥11 px et textes longs ≥14 px.
- TypeScript, tests métier, audit RC, build web et audit responsive.

## Éléments manuels avant soumission

### App Store Connect

- Compte de démonstration stable et instructions de revue.
- Réponses App Privacy conformes au backend et aux SDK réellement déployés.
- Questionnaire de classification d’âge.
- Captures demandées pour tous les appareils pris en charge.
- Coordonnées d’assistance et notes de revue.

### Google Play Console

- Compte de démonstration dans « Accès à l’application ».
- Formulaire « Sécurité des données » conforme au backend et aux SDK.
- Politique de confidentialité, suppression de compte et classification du contenu.
- Déclarations relatives aux permissions sensibles.
- Test interne ou fermé avant production.

## Contrôles externes indispensables

- Build signé réel avec les identifiants Apple et Google de Neptune.
- APNs et FCM testés sur appareils physiques.
- Appels audio/vidéo testés en Wi-Fi, 4G/5G et via TURN de production.
- Backend de production disponible sans données fictives.
- Validation finale des déclarations de collecte avec le responsable RGPD.
