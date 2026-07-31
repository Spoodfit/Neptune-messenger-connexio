# Diagnostic temporaire Connexio

Commit testé : `252adf5a567409c9cef55b8ec36c8abe06e6aa76`

| Étape | Code |
|---|---:|
| npm ci | 0 |
| TypeScript | 2 |
| Tests | 0 |
| Expo check | 0 |

## TypeScript
```text

> neptune-messenger-connexio@0.2.0 typecheck
> tsc --noEmit

app/(tabs)/highlights.tsx(87,39): error TS2551: Property 'absoluteFillObject' does not exist on type 'typeof StyleSheet'. Did you mean 'absoluteFill'?
app/(tabs)/messages.tsx(186,39): error TS2551: Property 'absoluteFillObject' does not exist on type 'typeof StyleSheet'. Did you mean 'absoluteFill'?
app/account.tsx(53,52): error TS2820: Type '"devices-outline"' is not assignable to type '"filter" | "infinite" | "text" | "push" | "map" | "at" | "key" | "search" | "repeat" | "link" | "image" | "alert" | "checkbox" | "menu" | "radio" | "timer" | "list" | "scale" | "arrow-down" | ... 1338 more ... | undefined'. Did you mean '"dice-outline"'?
app/account.tsx(71,42): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
app/account.tsx(78,26): error TS18048: 'title' is possibly 'undefined'.
app/account.tsx(82,48): error TS18048: 'title' is possibly 'undefined'.
app/highlight/[id].tsx(175,67): error TS2551: Property 'absoluteFillObject' does not exist on type 'typeof StyleSheet'. Did you mean 'absoluteFill'?
app/new-highlight.tsx(265,33): error TS2551: Property 'absoluteFillObject' does not exist on type 'typeof StyleSheet'. Did you mean 'absoluteFill'?
app/privacy.tsx(79,17): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
app/sign-in.tsx(87,67): error TS2551: Property 'absoluteFillObject' does not exist on type 'typeof StyleSheet'. Did you mean 'absoluteFill'?
src/components/HighlightCard.tsx(137,31): error TS2551: Property 'absoluteFillObject' does not exist on type 'typeof StyleSheet'. Did you mean 'absoluteFill'?
src/screens/NewConversationScreen.tsx(183,37): error TS2551: Property 'absoluteFillObject' does not exist on type 'typeof StyleSheet'. Did you mean 'absoluteFill'?
```

## Tests
```text
  ...
# Subtest: les contenus et secrets sont masqués récursivement
ok 31 - les contenus et secrets sont masqués récursivement
  ---
  duration_ms: 0.871555
  ...
# Subtest: les anciens rôles sont normalisés vers les six statuts Neptune
ok 32 - les anciens rôles sont normalisés vers les six statuts Neptune
  ---
  duration_ms: 0.860686
  ...
# Subtest: les permissions comparent les rôles normalisés
ok 33 - les permissions comparent les rôles normalisés
  ---
  duration_ms: 0.173075
  ...
# Subtest: une conversation restreinte sans rôles autorisés reste invisible
ok 34 - une conversation restreinte sans rôles autorisés reste invisible
  ---
  duration_ms: 0.137207
  ...
# Subtest: supprime la session uniquement quand le refresh token est invalide
ok 35 - supprime la session uniquement quand le refresh token est invalide
  ---
  duration_ms: 0.852099
  ...
# Subtest: conserve la session locale lors d'une panne temporaire
ok 36 - conserve la session locale lors d'une panne temporaire
  ---
  duration_ms: 0.178014
  ...
# Subtest: utilise le token de secours sans runtime configuré
ok 37 - utilise le token de secours sans runtime configuré
  ---
  duration_ms: 1.091208
  ...
# Subtest: le runtime devient la source de vérité de la session
ok 38 - le runtime devient la source de vérité de la session
  ---
  duration_ms: 0.355447
  ...
# Subtest: le nettoyage d'un ancien runtime ne supprime pas le runtime courant
ok 39 - le nettoyage d'un ancien runtime ne supprime pas le runtime courant
  ---
  duration_ms: 0.335139
  ...
# Subtest: calcule l'expiration à partir de expiresIn
ok 40 - calcule l'expiration à partir de expiresIn
  ---
  duration_ms: 0.856197
  ...
# Subtest: rafraîchit un token absent ou proche de l'expiration
ok 41 - rafraîchit un token absent ou proche de l'expiration
  ---
  duration_ms: 0.18639
  ...
# Subtest: un skew négatif est neutralisé
ok 42 - un skew négatif est neutralisé
  ---
  duration_ms: 0.146415
  ...
# Subtest: normalise une session snake_case sans donner de privilèges par défaut
ok 43 - normalise une session snake_case sans donner de privilèges par défaut
  ---
  duration_ms: 1.346978
  ...
# Subtest: refuse une session sans jetons ou durée valide
ok 44 - refuse une session sans jetons ou durée valide
  ---
  duration_ms: 0.469221
  ...
# Subtest: normalise conversations et compteurs snake_case en lecture seule par défaut
ok 45 - normalise conversations et compteurs snake_case en lecture seule par défaut
  ---
  duration_ms: 0.476254
  ...
# Subtest: refuse un type de conversation absent ou inconnu
ok 46 - refuse un type de conversation absent ou inconnu
  ---
  duration_ms: 0.23432
  ...
# Subtest: normalise un message temps réel minimal
ok 47 - normalise un message temps réel minimal
  ---
  duration_ms: 0.411522
  ...
# Subtest: valide une page curseur et refuse un curseur non textuel
ok 48 - valide une page curseur et refuse un curseur non textuel
  ---
  duration_ms: 1.184592
  ...
# Subtest: le libellé affiché est toujours dérivé du rôle canonique
ok 49 - le libellé affiché est toujours dérivé du rôle canonique
  ---
  duration_ms: 1.280273
  ...
# Subtest: les avatars distants doivent utiliser HTTPS
ok 50 - les avatars distants doivent utiliser HTTPS
  ---
  duration_ms: 0.330611
  ...
# Subtest: les compteurs sont entiers, positifs et la publication reste refusée par défaut
ok 51 - les compteurs sont entiers, positifs et la publication reste refusée par défaut
  ---
  duration_ms: 0.428454
  ...
# Subtest: refuse les messages et curseurs surdimensionnés
ok 52 - refuse les messages et curseurs surdimensionnés
  ---
  duration_ms: 0.617418
  ...
1..52
# tests 52
# suites 0
# pass 52
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 826.496367
```

## Expo
```text
Dependencies are up to date
```
