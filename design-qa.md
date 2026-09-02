# Design QA — Radar Connexio V27

## Cible produit

La carte doit permettre, sans apprentissage, de répondre à trois questions : qui est là, qui peut échanger maintenant, et quel évènement peut être rejoint. La note cible de 9,5/10 est une gate mesurable, pas une appréciation esthétique.

## Scorecard de validation

| Dimension | Poids | Critère de réussite |
| --- | ---: | --- |
| Compréhension immédiate | 2,0 | Personnes, visios et évènements se distinguent sans ouvrir une légende. |
| Carte exploitable | 2,0 | Aucun panneau permanent ne cache le centre ; le Pulse est replié et les filtres sont fermés par défaut. |
| Densité | 1,5 | Les scénarios 1, 2, 5, 10, 25, 50 et 100 gardent un total exact, trois personnages maximum et aucun déploiement radial. |
| Action en un contexte | 1,5 | Disponible → visio ; visio active → toquer ; occupé/hors ligne → message ou rendez-vous ; évènement → inscription/participation. |
| Identité | 1,0 | Personnage Connexio original sur la carte, photo puis initiales en repli ; la vidéo remplace le personnage seulement après démarrage réel du flux. |
| Accessibilité | 1,0 | Cibles ≥ 44 px, statut donné par forme/texte en plus de la couleur, libellés dans six langues, réduction des animations respectée. |
| Robustesse | 1,0 | Build web, tests, sécurité WebView/CSP, contrastes, responsive et workflows GitHub passent sans erreur. |

## Décisions appliquées

- Le rail `Tout / Disponibles / Évènements` est remplacé par un filtre compact de 48 px, fermé par défaut.
- Le grand bloc d’opportunités devient un Pulse d’une ligne, explicitement dépliable et automatiquement replié dès que la carte bouge.
- Un agrégat régional zoome d’abord ; une fiche de zone ne s’ouvre que si plusieurs objets partagent exactement le même point.
- Les profils ronds de la carte deviennent des personnages debout originaux Connexio, avec une embase et un symbole de statut (`✓`, `▶`, `–`).
- Les visios denses affichent au plus trois personnages et le nombre réel de participants, y compris `100`.
- Les évènements conservent une tuile calendrier indépendante et un ancrage géographique visible.
- Les avatars sont servis en WebP transparents de 7 à 9 Ko ; un champ backend HTTPS `map_avatar_url` permet le déploiement progressif.

## Vérifications

- `npm run verify` : réussi — 173 tests, couverture lignes ≥ 89 %, sécurité, contrastes et six langues.
- `EXPO_PUBLIC_MOCK_MODE=true npm run web:build` : réussi.
- Product Audit CI : vérifie 280×568, 320×568, 393×852, 430×720, 768×1024 et 1024×768, puis capture le cas dense de 100 membres.

La note 9,5/10 n’est validée qu’après passage du Product Audit visuel et revue de ses captures.

final result: passed
