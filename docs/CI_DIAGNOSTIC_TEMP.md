# Diagnostic temporaire Connexio

Commit testé : `8978c55967d78d0a809dd32ca61ece2cdcf2828e`

| Étape | Code |
|---|---:|
| npm ci | 0 |
| TypeScript | 0 |
| Tests | 0 |
| Expo check | 0 |

## TypeScript
```text

> neptune-messenger-connexio@0.2.0 typecheck
> tsc --noEmit

```

## Tests
```text
  ...
# Subtest: les contenus et secrets sont masqués récursivement
ok 31 - les contenus et secrets sont masqués récursivement
  ---
  duration_ms: 0.88925
  ...
# Subtest: les anciens rôles sont normalisés vers les six statuts Neptune
ok 32 - les anciens rôles sont normalisés vers les six statuts Neptune
  ---
  duration_ms: 0.878729
  ...
# Subtest: les permissions comparent les rôles normalisés
ok 33 - les permissions comparent les rôles normalisés
  ---
  duration_ms: 0.18225
  ...
# Subtest: une conversation restreinte sans rôles autorisés reste invisible
ok 34 - une conversation restreinte sans rôles autorisés reste invisible
  ---
  duration_ms: 0.141344
  ...
# Subtest: supprime la session uniquement quand le refresh token est invalide
ok 35 - supprime la session uniquement quand le refresh token est invalide
  ---
  duration_ms: 0.911482
  ...
# Subtest: conserve la session locale lors d'une panne temporaire
ok 36 - conserve la session locale lors d'une panne temporaire
  ---
  duration_ms: 0.163786
  ...
# Subtest: utilise le token de secours sans runtime configuré
ok 37 - utilise le token de secours sans runtime configuré
  ---
  duration_ms: 1.149936
  ...
# Subtest: le runtime devient la source de vérité de la session
ok 38 - le runtime devient la source de vérité de la session
  ---
  duration_ms: 0.428941
  ...
# Subtest: le nettoyage d'un ancien runtime ne supprime pas le runtime courant
ok 39 - le nettoyage d'un ancien runtime ne supprime pas le runtime courant
  ---
  duration_ms: 0.338401
  ...
# Subtest: calcule l'expiration à partir de expiresIn
ok 40 - calcule l'expiration à partir de expiresIn
  ---
  duration_ms: 0.861578
  ...
# Subtest: rafraîchit un token absent ou proche de l'expiration
ok 41 - rafraîchit un token absent ou proche de l'expiration
  ---
  duration_ms: 0.174656
  ...
# Subtest: un skew négatif est neutralisé
ok 42 - un skew négatif est neutralisé
  ---
  duration_ms: 0.15059
  ...
# Subtest: normalise une session snake_case sans donner de privilèges par défaut
ok 43 - normalise une session snake_case sans donner de privilèges par défaut
  ---
  duration_ms: 1.336835
  ...
# Subtest: refuse une session sans jetons ou durée valide
ok 44 - refuse une session sans jetons ou durée valide
  ---
  duration_ms: 0.444078
  ...
# Subtest: normalise conversations et compteurs snake_case en lecture seule par défaut
ok 45 - normalise conversations et compteurs snake_case en lecture seule par défaut
  ---
  duration_ms: 0.437747
  ...
# Subtest: refuse un type de conversation absent ou inconnu
ok 46 - refuse un type de conversation absent ou inconnu
  ---
  duration_ms: 0.231472
  ...
# Subtest: normalise un message temps réel minimal
ok 47 - normalise un message temps réel minimal
  ---
  duration_ms: 0.377524
  ...
# Subtest: valide une page curseur et refuse un curseur non textuel
ok 48 - valide une page curseur et refuse un curseur non textuel
  ---
  duration_ms: 1.05052
  ...
# Subtest: le libellé affiché est toujours dérivé du rôle canonique
ok 49 - le libellé affiché est toujours dérivé du rôle canonique
  ---
  duration_ms: 1.349669
  ...
# Subtest: les avatars distants doivent utiliser HTTPS
ok 50 - les avatars distants doivent utiliser HTTPS
  ---
  duration_ms: 0.298988
  ...
# Subtest: les compteurs sont entiers, positifs et la publication reste refusée par défaut
ok 51 - les compteurs sont entiers, positifs et la publication reste refusée par défaut
  ---
  duration_ms: 0.450541
  ...
# Subtest: refuse les messages et curseurs surdimensionnés
ok 52 - refuse les messages et curseurs surdimensionnés
  ---
  duration_ms: 0.617392
  ...
1..52
# tests 52
# suites 0
# pass 52
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 851.725502
```

## Expo
```text
Dependencies are up to date
```
