# Connexio — UX Next specification

Status: implementation target for the post-RC UX pass.

## Non-negotiable visual rules

- All person/profile avatars are circular everywhere in the app.
- Visionnaire avatars use the Neptune multicolour/rainbow status ring with a controlled soft glow.
- Other canonical statuses use a subtle status-specific two-tone neon gradient ring; never a flat rectangle border.
- Private conversations must show the sender/member status ring just like group and profile surfaces.
- Group member imagery is represented as dense overlapping circular member portraits, not as a square collage that crops faces.
- Tappable targets remain at least 48x48 dp.
- Swipe destructive underlays remain visually hidden until a deliberate horizontal gesture reveals them.
- No platform-native confirmation alert may be used for destructive Connexio actions; confirmations use a branded in-app dialog/sheet.

## Central + menu

The Conversation and Temps fort actions must be clearly distinguishable from the current background. Use an elevated Connexio surface, stronger text/icon contrast, subtle border/glow and explicit pressed/focus states without becoming visually loud.

## Conversations: swipe and destructive confirmation

- Swipe action content is clipped by the row container and revealed progressively.
- No delete/hide text or icon should bleed through an unswiped row.
- Destructive actions require the branded Connexio confirmation dialog.
- The dialog must support title, explanation, cancel, destructive confirm, accessibility labels/focus and both light/dark themes.

## Status avatar system

Canonical roles:
- Visionnaire: multicolour Neptune gradient/rainbow ring.
- Amiral: violet to electric blue.
- Capitaine: blue to turquoise.
- Moussaillon: Neptune blue to cyan.
- Triton: cyan to aqua/green.
- Administration: warm gold to violet accent while retaining clear administrative identity.

The ring is decorative status metadata; the portrait itself must remain readable and fill the circular crop using cover positioning.

## Calls home

The Calls screen is a connection hub, not only a call history.

It contains:
- immediate search across Connexio people (name, company and club where available);
- frequent/suggested people ranked from explainable local interaction signals;
- recent calls;
- upcoming scheduled calls and pending requests;
- one-tap entry to schedule a call.

### Immediate call

Every call requires a subject. The existing typed/oral subject flow is preserved. A call cannot be started until a non-empty subject exists.

### Scheduled call

A scheduled call contains at minimum:
- requester;
- recipient(s);
- required subject;
- requested date/time and timezone;
- status: pending, accepted, declined, cancelled, completed;
- reminder policy;
- optional invited guests.

Flow:
1. requester chooses a Connexio person;
2. enters or dictates the required subject;
3. selects date/time;
4. sends a request;
5. recipient accepts/declines;
6. when accepted, both clients show the appointment in Calls and schedule reminders;
7. at due time, the backend creates/activates the call session and signals entitled participants so Connexio can ring them.

Production must never claim a scheduled call is accepted or persisted until the backend acknowledges it.

Suggested reminder policy: adaptive rather than fixed. Long-lead appointments can receive J-1 / H-1 / M-10; short-lead appointments only receive reminders that still make sense. Users can mute/adjust reminders per appointment.

## Suggested/frequent people

Use explainable scoring and avoid opaque behavioural profiling. Candidate signals can include call frequency, call recency, reciprocal message activity and an optional time-decay. The score is used only to order convenient shortcuts and does not affect permissions or visibility.

## Light theme

Connexio supports System / Dark / Light. Dark remains the visual reference; Light is a real tokenised theme, not an inverted dark screen.

Light principles:
- warm/neutral off-white background rather than pure white everywhere;
- Neptune navy for primary text;
- blue/purple brand accents retained;
- cards separated by restrained borders/shadows;
- status neon rings preserved but reduced in bloom on light surfaces;
- WCAG AA contrast maintained.

All new components must consume semantic theme tokens rather than hard-coded screen colours.

## Gesture navigation

- Bottom navigation remains the explicit primary navigation.
- Horizontal swipe may move between primary root screens and keeps the nav selection synchronised.
- Gesture arbitration must prevent tab navigation from stealing swipes belonging to conversation rows, carousels, maps or other horizontal controls.
- Back navigation uses an edge-origin left-to-right gesture where applicable, preserving the platform back behaviour on Android and stack back gesture on iOS.
- A vertical gesture must never accidentally switch tabs.

## Contacts, invitations and recommendations

Device contacts are opt-in and least-privilege.

Rules:
- request contacts permission only after an explicit user action;
- do not upload or sync the whole address book by default;
- search/select locally on device where possible;
- expose only the selected contact details after explicit confirmation;
- allow: invite a contact to Connexio, share Connexio, recommend a selected contact to another user, and invite a selected contact to a scheduled call;
- prefer native share/deep-link flows for non-members;
- existing Connexio members use in-app identity/invitations rather than duplicating their device contact data.

## App icon correction

Android adaptive icon assets must be distinct from the regular app icon.

- `icon.png`: opaque square application icon.
- `adaptive-icon.png`: transparent foreground layer with the logo fully inside the Android adaptive-icon safe area.
- background colour is provided separately by Expo/Android.
- `splash-icon.png`: independent splash artwork and must never be reused as the adaptive foreground.

The current half-cropped launcher icon is treated as an asset/safe-area bug, not as a UI scaling issue. Prebuild/build validation must verify the adaptive foreground is a distinct file and contains transparent padding around the brand mark.

## Backend contract boundary

The frontend may demonstrate scheduling in standalone/mock mode, but production requires backend persistence and acknowledgement for scheduled calls, request/accept/decline/cancel, reminders/push signalling and due-time call activation. No production path may fake success while these capabilities are absent.
