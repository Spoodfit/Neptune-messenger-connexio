# Tester Connexio en un clic

## Option 1 — Aucun logiciel à lancer

Ouvrir la prévisualisation web de démonstration :

https://neptunebusinessclub.github.io/Neptune-messenger-connexio/

Le déploiement GitHub Pages est construit automatiquement depuis la branche `feat/production-hardening` en mode démonstration.

Cette version utilise uniquement les données fictives locales. Elle permet de contrôler le design, la navigation, les conversations, les pièces jointes, les Temps forts, la Map, les appels et la responsivité. Elle ne valide pas les notifications natives, SQLCipher, le clavier mobile, APNs/FCM ni le backend Neptune.

## Option 2 — Double-clic sous Windows

1. Télécharger ou cloner la branche `feat/production-hardening`.
2. Ouvrir le dossier du projet.
3. Double-cliquer sur `TESTER_CONNEXIO.bat`.

Le script :

- vérifie la présence de Node.js 22 ou plus ;
- installe automatiquement les dépendances lors du premier lancement ;
- force le mode démonstration ;
- démarre Expo Web ;
- ouvre automatiquement Connexio dans le navigateur.

Pour arrêter le test, fermer la fenêtre noire ou utiliser `Ctrl+C`.

## Limites

Ce lancement est une prévisualisation web. Pour valider le produit mobile, il faudra ensuite installer une build EAS Preview sur un iPhone et au moins deux appareils Android.
