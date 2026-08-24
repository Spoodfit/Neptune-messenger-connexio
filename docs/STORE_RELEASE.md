# Publication iOS et Android

## Avant toute soumission

- utiliser exclusivement le projet EAS Connexio `1e85dc3a-4114-4387-8e15-2463a82e68fd` ;
- ajouter les identifiants Apple Developer et Google Play Console ;
- configurer APNs et FCM v1 ;
- ajouter l’icône 1024 × 1024, le splash screen et les captures ;
- fixer le nom public et le sous-titre ;
- mettre en ligne une politique de confidentialité ;
- mettre en ligne les CGU ;
- permettre la suppression du compte ;
- décrire les données collectées dans App Privacy et Data Safety ;
- tester sur appareils réels iOS et Android ;
- vérifier le fonctionnement en réseau faible ;
- vérifier les liens profonds ;
- valider les notifications en avant-plan, arrière-plan et application fermée.

## Builds

```bash
npx eas-cli@21.7.1 project:info
npx eas-cli@21.7.1 credentials --platform android
npm run verify:rc
npm run smoke:production
npx eas build --profile production --platform all
```

Ne pas relancer `eas init` : le dépôt est déjà relié au projet EAS Connexio.
Le workflow manuel `Build native production binaries` exécute ces contrôles dans cet ordre et construit toujours depuis `release/connexio-rc1`. Il ne soumet jamais automatiquement le binaire aux Stores.

## Publication

```bash
npx eas submit --platform ios
npx eas submit --platform android
```

## Risques de rejet Apple/Google

- compte impossible à supprimer ;
- collecte de données non déclarée ;
- notifications envoyées sans consentement ;
- contenu généré par les utilisateurs sans signalement, blocage et modération ;
- application trop vide ou présentée comme simple coquille web ;
- accès au compte de démonstration non fourni aux équipes de revue ;
- icônes, métadonnées ou captures incohérentes ;
- absence de procédure pour gérer les abus.

## Critères de sortie pilote

- aucune perte de message sur 500 envois de test ;
- taux de livraison push mesuré ;
- droits d’accès vérifiés pour chaque rôle ;
- révocation d’un membre appliquée en moins d’une minute ;
- reprise après coupure réseau ;
- journalisation serveur des erreurs ;
- sauvegardes restaurables ;
- procédure de support et d’escalade.
