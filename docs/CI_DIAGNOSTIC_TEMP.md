# Diagnostic temporaire Connexio

Commit testé : `e03389987081a1a21660230d101016672b3175ae`

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
src/providers/ExperienceProviderV2.tsx(12,3): error TS2724: '"../data/experienceMock"' has no exported member named 'demoCallHistory'. Did you mean 'callHistory'?
src/providers/ExperienceProviderV2.tsx(13,3): error TS2724: '"../data/experienceMock"' has no exported member named 'demoHighlightPosts'. Did you mean 'highlightPosts'?
src/providers/ExperienceProviderV2.tsx(14,3): error TS2724: '"../data/experienceMock"' has no exported member named 'demoMapMoments'. Did you mean 'mapMoments'?
src/providers/ExperienceProviderV2.tsx(15,3): error TS2305: Module '"../data/experienceMock"' has no exported member 'demoMembers'.
src/providers/ExperienceProviderV2.tsx(16,3): error TS2724: '"../data/experienceMock"' has no exported member named 'demoPrivateConversations'. Did you mean 'privateConversations'?
src/providers/ExperienceProviderV2.tsx(17,3): error TS2724: '"../data/experienceMock"' has no exported member named 'demoPrivateMessages'. Did you mean 'privateMessages'?
src/providers/ExperienceProviderV2.tsx(19,10): error TS2305: Module '"../domain/roles"' has no exported member 'canRoleSeeConversation'.
src/providers/ExperienceProviderV2.tsx(24,3): error TS2305: Module '"../types/experience"' has no exported member 'HighlightDraft'.
src/providers/ExperienceProviderV2.tsx(29,3): error TS2305: Module '"../types/experience"' has no exported member 'UserCall'.
src/providers/ExperienceProviderV2.tsx(148,45): error TS7006: Parameter 'member' implicitly has an 'any' type.
src/providers/ExperienceProviderV2.tsx(153,41): error TS7006: Parameter 'member' implicitly has an 'any' type.
src/providers/ExperienceProviderV2.tsx(207,42): error TS7006: Parameter 'member' implicitly has an 'any' type.
src/providers/ExperienceProviderV2.tsx(364,9): error TS2353: Object literal may only specify known properties, and 'latitude' does not exist in type 'HighlightPost'.
src/providers/ExperienceProviderV2.tsx(403,13): error TS2741: Property 'postId' is missing in type '{ id: string; author: AppUser; body: string; createdAt: string; parentCommentId: string | undefined; mentionedUserIds: string[] | undefined; reactions: never[]; }' but required in type 'HighlightComment'.
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
npm error A complete log of this run can be found in: /home/runner/.npm/_logs/2026-07-31T10_45_46_050Z-debug-0.log
```

## Expo
```text
Dependencies are up to date
```
