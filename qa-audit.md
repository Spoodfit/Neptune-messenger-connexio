# Rapport QA UI/UX — Connexio / Coworking V24

Date de la passe : 23 août 2026  
Branche : `fix/v24-geographic-coworking`  
Build Expo : aucun nouveau build lancé.

## Verdict

**Final result: blocked**

La logique et le socle frontend sont suffisamment contrôlés pour poursuivre la recette, mais la certification visuelle finale est bloquée : le navigateur cloud ne peut pas atteindre le serveur local (`ERR_BLOCKED_BY_CLIENT`) et aucun exécutable Chromium n’est disponible pour Playwright dans l’environnement. Il est donc impossible de certifier honnêtement l’absence de collision, de clipping ou de régression tactile à partir de captures réelles.

## Vérifications exécutées

| Contrôle | Résultat |
|---|---|
| TypeScript | OK — `tsc --noEmit` |
| Tests métier | OK — 120 tests, 0 échec |
| Export web Expo | OK — bundle Metro généré |
| Contraste thème | OK — palette light validée WCAG |
| Couverture i18n | OK — 811 libellés, 6 langues |
| Audit locale | OK |
| Audit release candidate | OK — 372 fichiers |
| Audit dépendances production | OK hors deux avis GHSA documentés par le dépôt |
| Intégrité du diff | OK — `git diff --check` |
| Audit navigateur Product/Interaction/Visual | Bloqué — Chromium absent / serveur local inaccessible |

## Corrections réalisées pendant cette passe

- Cache et réattachement des flux vidéo des marqueurs après clusterisation ou réinsertion d’un marqueur.
- Marqueurs de carte et clusters navigables au clavier avec rôles et libellés accessibles.
- Contrôle « Me localiser » ajouté au rendu web de la Map.
- Stabilisation des clés de rendu Map pour éviter les reconnexions WebView lors d’un simple refresh de présence.
- Les contrôles caméra/micro et le déplacement spatial ne reconstruisent plus la WebView média.
- L’état caméra/micro est conservé entre la salle et le retour à la Map.
- Le retour à la Map depuis une salle n’utilise plus le jeton publisher de la salle : seule une session d’observation backend peut être utilisée, afin d’éviter un second publisher vidéo.
- Les sessions `observer_media` sont désormais en lecture seule par défaut.
- Une sortie de salle ne navigue plus avant la confirmation du départ serveur.
- Les erreurs de réponse à un toquement sont visibles à l’utilisateur.
- Un refus caméra/micro remet les contrôles locaux dans un état cohérent.
- Les animations décoratives principales respectent la préférence système « réduire les animations ».
- La bascule de traduction des cartes Temps fort possède une cible tactile minimale de 44 px.

## Points encore ouverts avant “release candidate”

### P0 — preuve QA manquante

Captures et parcours réels à rejouer avec Chromium ou une build native : écrans Messages, Chat, Map, fiche membre, mosaïque vidéo, Salle générale, appels, profil, compte, paramètres et confidentialité, sur 280/320/390/430/768/1024 px.

### P1 — média réel à valider en intégration

Le dépôt ne contient pas le serveur SFU ni `window.ConnexioCoworkingClient`. Les flux live, la reconnexion, le TURN, le refus de permission et le toquement multi-utilisateur restent dépendants du backend et de deux comptes de test.

### P1 — fiche Map

La fiche membre native affiche encore `StatusAvatar`; elle ne réplique pas directement la vignette vidéo live déjà rendue dans la WebView de la carte. Le marqueur reste bien vidéo/avatars selon l’état, mais l’exigence « fiche avec sa caméra si active » doit être validée ou complétée dans une prochaine passe.

### P1 — Web

La salle privée web affiche volontairement un écran d’orientation « Visio Coworking mobile » au lieu d’un flux média complet. Le périmètre mobile est prioritaire, mais ce comportement doit être assumé comme limitation produit ou implémenté avant de présenter le web comme équivalent natif.

### P2 — dépendances

L’audit production accepte les avis `GHSA-w3rx-r6r6-pgpr` et `GHSA-5p2g-fcmc-qvqq` comme exceptions temporaires sans correctif amont disponible. Ils doivent rester suivis avant publication.

## Conditions de clôture

1. Rejouer l’audit navigateur avec un Chromium disponible et conserver les captures.
2. Tester la Map avec permission caméra accordée, refusée puis rétablie.
3. Tester deux comptes : Bonjour, Toquer, Refuser, Accepter et arrivée dans la même visio.
4. Vérifier qu’un retour Map depuis une salle ne crée ni deuxième publisher ni double présence.
5. Tester la Salle générale avec plusieurs membres, déplacement, volume de proximité et micro coupé à l’entrée.
6. Valider VoiceOver/TalkBack, clavier web, réduction des animations, petits écrans et paysage sur appareils physiques.
