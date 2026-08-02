# Correctif final de l’audit responsive

Date : 31 juillet 2026.

## Défaut détecté

L’audit navigateur identifiait un chevauchement entre la dernière conversation visible et la navigation inférieure uniquement sur les formats `280 × 568` et `320 × 568`.

Aucun débordement horizontal, aucune cible tactile trop petite, aucune erreur runtime et aucun échec des autres parcours n’étaient présents.

## Cause

La `FlatList` de l’écran Messages n’était pas contrainte à l’espace vertical restant. Sur les faibles hauteurs, son contenu pouvait dépasser la scène et passer derrière la barre d’onglets.

## Correction

Le viewport de la liste utilise désormais :

- `flex: 1` pour occuper uniquement l’espace disponible ;
- `minHeight: 0` pour autoriser la réduction correcte dans la hiérarchie flex, notamment sur le web.

Le seuil de l’audit n’a pas été diminué et aucune collision n’a été ignorée artificiellement.
