# Publication iOS et Android

## Avant toute soumission

- créer le projet EAS et renseigner `EXPO_PUBLIC_EAS_PROJECT_ID` ;
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
npx eas init
npx eas build --profile development --platform all
npx eas build --profile preview --platform all
npx eas build --profile production --platform all
```

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
