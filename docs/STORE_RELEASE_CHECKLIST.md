# Connexio — contrôle de publication stores

## Validation RC1 / V15

- Validation technique initiale exécutée le 5 août 2026.
- Socle natif validé à partir du commit `8d9597119b49b97d0e32866cb5904609fd41bb1c`.
- La V15 doit être revalidée sur son commit final fusionné avant toute nouvelle diffusion native.
- Les contrôles GitHub indépendants doivent rester verts sur le dernier commit de la branche avant soumission.

## Contrôles automatisés

- Expo SDK 57, Android API 36 et image EAS `sdk-57`.
- Image iOS EAS `sdk-57`, compatible Xcode 26 et SDK iOS 26.
- Prébuild iOS et Android reproductible.
- Manifest de confidentialité iOS présent et syntaxiquement valide.
- Permissions sensibles documentées.
- Permission Contacts limitée à la lecture/sélection ; `WRITE_CONTACTS` bloqué sur Android.
- Politique de confidentialité, assistance et suppression de compte obligatoires.
- Conditions d’utilisation HTTPS et acceptation explicite avant accès aux fonctions de contenu utilisateur.
- Signalement de contenu et blocage des utilisateurs accessibles dans l’application.
- Sons natifs de notification et de mention embarqués.
- APK de contrôle ciblant l’API 36 et vérifié pour l’alignement 16 Ko.
- Asset adaptatif Android transparent, centré et limité à la safe-zone définie par le workflow.
- Audit visuel 360×800, 390×844 et 393×852, plus très petit écran 280 px.
- Zones tactiles minimales 48×48, champs à 16 px, textes courts ≥11 px et textes longs ≥14 px.
- TypeScript, tests métier, audit RC, build web et audit responsive.
- Tests de contrat traduction/sous-titrage : feature-gate, langue cible, micro coupé et disponibilité du service.
- Thèmes Système/Sombre/Clair sans débordement ni perte de contraste sur les quatre onglets principaux.
- Navigation par swipe sans collision avec le swipe des conversations, membres et carrousels.

## Éléments manuels avant soumission

### App Store Connect

- Compte de démonstration stable et instructions de revue.
- Réponses App Privacy conformes au backend, aux SDK, à la sélection de contacts et aux fournisseurs de traduction/transcription réellement déployés.
- Déclarer l’accès Contacts avec la finalité exacte : invitation/recommandation/invité externe, sans import global du carnet.
- Questionnaire de classification d’âge.
- Captures demandées pour tous les appareils pris en charge, incluant thème sombre et clair si représentatifs.
- Coordonnées d’assistance et notes de revue.

### Google Play Console

- Compte de démonstration dans « Accès à l’application ».
- Formulaire « Sécurité des données » conforme au backend, aux SDK, à la sélection de contacts et aux fournisseurs de traduction/transcription réellement déployés.
- Déclarer `READ_CONTACTS` et documenter que `WRITE_CONTACTS` est bloqué et qu’aucun carnet global n’est synchronisé.
- Politique de confidentialité, suppression de compte et classification du contenu.
- Déclarations relatives aux permissions sensibles.
- Test interne ou fermé avant production.

## Contrôles externes indispensables

- Build signé réel avec les identifiants Apple et Google de Neptune.
- APNs et FCM testés sur appareils physiques.
- Appels audio/vidéo testés en Wi-Fi, 4G/5G et via TURN de production.
- Appels programmés testés sur deux comptes réels : création, invitation, acceptation, refus, annulation, changement de date, rappels et déclenchement à échéance.
- Vérifier qu’aucune sonnerie distante n’est déclenchée pour un rendez-vous en attente, refusé ou annulé.
- Vérifier les rendez-vous lors d’un changement de fuseau et autour d’un changement d’heure été/hiver.
- Sélecteur de contacts testé avec refus d’autorisation, autorisation accordée, sélection, annulation du picker et partage confirmé.
- Vérifier qu’aucun import global du carnet n’est effectué et qu’une recommandation montre les coordonnées avant partage.
- Icône Android vérifiée physiquement avec au moins un launcher rond et un launcher squircle ; logo intégralement visible et centré.
- Splash blanc et logo non tronqué vérifiés sur plusieurs densités Android.
- Sous-titres traduits testés sur appareils physiques avec micro actif, coupé, réactivé et perte/reprise réseau.
- Traduction de messages testée entre au moins trois langues avec original consultable et absence de traduction obsolète après changement de langue.
- Fournisseurs de traduction/transcription choisis, contractuellement validés et nommés dans les informations de confidentialité avant activation publique.
- Backend de production disponible sans données fictives.
- Validation finale des déclarations de collecte avec le responsable RGPD.
