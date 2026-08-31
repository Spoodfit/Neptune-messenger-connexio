# Gouvernance GitHub et release Connexio

Ce document décrit les réglages d’administration requis autour des garde-fous versionnés dans le dépôt. Ces réglages ne peuvent pas être imposés par une pull request et doivent être activés par un administrateur GitHub.

## Règles de branches requises

Appliquer un ruleset à `main` et `release/connexio-rc1` avec les contraintes suivantes :

- pull request obligatoire, avec au moins une approbation ;
- nouvelles approbations requises après une modification du candidat ;
- toutes les conversations résolues avant fusion ;
- checks obligatoires : `CI / verify`, `CI / responsive-audit` et `Product Audit / product-audit` ;
- force-push et suppression de branche interdits ;
- contournement administrateur réservé à une procédure d’incident documentée.

La branche `main` doit contenir la version complète du produit avant toute release Store. Tant que le workflow `native-production.yml` n’y est pas promu, sa présence sur une branche secondaire ne le rend pas exploitable de manière fiable depuis l’interface GitHub Actions.

## Environnement de production

Créer ou vérifier l’environnement GitHub `production` :

- au moins un reviewer requis ;
- secret `EXPO_TOKEN` limité à cet environnement ;
- aucun secret serveur dans une variable `EXPO_PUBLIC_*` ;
- délai de protection optionnel avant une build Store.

La soumission App Store ou Play Store reste distincte de la construction des binaires. Le workflow de production construit et trace la provenance, mais ne soumet rien automatiquement.

## GitHub Pages

Configurer Pages avec **GitHub Actions** comme source. `web-preview.yml` est l’unique éditeur de la prévisualisation publique et déploie un artefact immuable depuis `main` ou `release/connexio-rc1`. Une pull request construit et vérifie le site sans le publier.

## Conditions avant promotion Store

Une promotion de `release/connexio-rc1` vers `main` exige :

1. le backend expose le contrat `connexio-v1` et passe `npm run smoke:production` ;
2. `npm run verify:rc` et les checks GitHub obligatoires réussissent sur le SHA exact ;
3. un APK/AAB Android et une archive iOS sont construits depuis ce même SHA ;
4. les deux binaires passent une validation sur appareils réels et pistes internes ;
5. les politiques publiques et la suppression de compte répondent sur leurs URL de production.

Les rapports EAS et snapshots de build sont conservés comme artefacts GitHub Actions. Ils ne doivent jamais être commités automatiquement dans la branche de release.
