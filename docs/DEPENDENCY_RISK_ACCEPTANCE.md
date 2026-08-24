# Acceptation temporaire du risque `image-size`

## Périmètre

Le lockfile contient `image-size@1.2.1` comme dépendance transitive de l’outillage Expo/Metro. Deux avis GitHub de sévérité haute n’ont aucun correctif amont au 24 août 2026 :

- [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) — boucle infinie du parseur ICNS ;
- [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) — boucles infinies des parseurs JXL/HEIF.

## Exposition réelle de Connexio

- `image-size` n’est pas une dépendance directe de l’application ;
- le module Node n’est pas présent comme service réseau du backend Neptune ;
- il n’est pas appelé par le client React Native pour analyser les fichiers envoyés par les membres ;
- son usage est limité à l’outillage de build Expo/Metro qui traite les assets versionnés et contrôlés du dépôt ;
- les médias membres doivent être contrôlés côté backend par MIME réel, limites, antivirus et stockage isolé, sans passer par ce module de build.

Le scénario distant décrit par les avis — faire analyser à un service Node une image hostile — n’est donc pas exposé par le binaire Connexio. Le risque résiduel concerne un asset hostile introduit dans le dépôt ou la chaîne de build, ce qui justifie le maintien des revues de code et des permissions GitHub minimales.

## Conditions de maintien de l’exception

L’audit bloque automatiquement si :

- `image-size` devient une dépendance directe ;
- sa version change sans nouvelle analyse ;
- un avis high/critical différent apparaît ;
- ce document ou l’un des identifiants d’avis disparaît.

Cette exception doit être réévaluée au prochain correctif Expo/Metro, au prochain changement de version `image-size` et au plus tard le 15 septembre 2026. Si une version corrigée devient disponible, l’exception doit être supprimée et le lockfile mis à jour.
