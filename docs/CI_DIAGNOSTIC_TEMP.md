# Diagnostic temporaire Connexio

Commit testé : `10c135face2e7b3801601333c5b627ad19a20f06`

| Étape | Code |
|---|---:|
| npm ci | 0 |
| TypeScript | 2 |
| Tests | 1 |
| Expo check | 0 |

## TypeScript
```text

> neptune-messenger-connexio@0.2.0 typecheck
> tsc --noEmit

app/(tabs)/highlights.tsx(17,24): error TS2307: Cannot find module '@/components/NeptuneMap' or its corresponding type declarations.
app/(tabs)/highlights.tsx(87,39): error TS2551: Property 'absoluteFillObject' does not exist on type 'typeof StyleSheet'. Did you mean 'absoluteFill'?
app/(tabs)/highlights.tsx(139,30): error TS7006: Parameter 'memberId' implicitly has an 'any' type.
app/(tabs)/messages.tsx(186,39): error TS2551: Property 'absoluteFillObject' does not exist on type 'typeof StyleSheet'. Did you mean 'absoluteFill'?
app/+not-found.tsx(7,29): error TS2307: Cannot find module '@/components/NeptuneMark' or its corresponding type declarations.
app/account.tsx(53,52): error TS2820: Type '"devices-outline"' is not assignable to type '"filter" | "infinite" | "text" | "push" | "map" | "at" | "key" | "link" | "search" | "image" | "alert" | "checkbox" | "menu" | "radio" | "timer" | "list" | "repeat" | "scale" | "arrow-down" | ... 1338 more ... | undefined'. Did you mean '"dice-outline"'?
app/account.tsx(71,42): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
app/account.tsx(78,26): error TS18048: 'title' is possibly 'undefined'.
app/account.tsx(82,48): error TS18048: 'title' is possibly 'undefined'.
app/highlight/[id].tsx(175,67): error TS2551: Property 'absoluteFillObject' does not exist on type 'typeof StyleSheet'. Did you mean 'absoluteFill'?
app/new-conversation.tsx(180,33): error TS2551: Property 'absoluteFillObject' does not exist on type 'typeof StyleSheet'. Did you mean 'absoluteFill'?
app/new-conversation.tsx(196,33): error TS2551: Property 'absoluteFillObject' does not exist on type 'typeof StyleSheet'. Did you mean 'absoluteFill'?
app/new-highlight.tsx(265,33): error TS2551: Property 'absoluteFillObject' does not exist on type 'typeof StyleSheet'. Did you mean 'absoluteFill'?
app/privacy.tsx(79,17): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
app/sign-in.tsx(18,29): error TS2307: Cannot find module '../src/components/NeptuneMark' or its corresponding type declarations.
app/sign-in.tsx(87,67): error TS2551: Property 'absoluteFillObject' does not exist on type 'typeof StyleSheet'. Did you mean 'absoluteFill'?
src/components/HighlightCard.tsx(137,31): error TS2551: Property 'absoluteFillObject' does not exist on type 'typeof StyleSheet'. Did you mean 'absoluteFill'?
```

## Tests
```text
npm error Missing script: "test:domain"
npm error
npm error Did you mean one of these?
npm error   npm run test:clean # run the "test:clean" package script
npm error   npm run test:compile # run the "test:compile" package script
npm error
npm error To see a list of scripts, run:
npm error   npm run
npm error A complete log of this run can be found in: /home/runner/.npm/_logs/2026-07-31T10_34_02_250Z-debug-0.log
```

## Expo
```text
Dependencies are up to date
```
