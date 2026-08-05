from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding="utf-8")


def patch_message_bubble() -> None:
    path = "src/components/MessageBubble.tsx"
    text = read(path)
    if "getRoleAppearance(" in text and "domain/roleAppearance" not in text:
        marker = 'import { colors, gradients, spacing, typography } from "../theme";\n'
        if marker not in text:
            raise RuntimeError("Import du thème MessageBubble introuvable.")
        text = text.replace(
            marker,
            'import { getRoleAppearance } from "../domain/roleAppearance";\n' + marker,
            1,
        )
    if "senderRoleAppearance" in text and "const senderRoleAppearance =" not in text:
        marker = "  const canReactWithLongPress = Boolean(onReact) && !message.isMine;\n"
        if marker not in text:
            raise RuntimeError("Point de déclaration du statut expéditeur introuvable.")
        text = text.replace(
            marker,
            marker
            + '  const senderRoleAppearance = getRoleAppearance(message.senderRole ?? "triton");\n',
            1,
        )
    write(path, text)


def patch_messaging_provider() -> None:
    path = "src/providers/MessagingProvider.tsx"
    text = read(path)
    if "void playMention();" in text:
        write(path, text)
        return

    hook_pattern = re.compile(
        r"const\s+\{(?P<names>[^}]*)\}\s*=\s*useActionSounds\(\);", re.S
    )
    match = hook_pattern.search(text)
    if not match:
        raise RuntimeError("Déstructuration de useActionSounds introuvable.")
    names = [name.strip() for name in match.group("names").split(",") if name.strip()]
    if "playMention" not in names:
        names.append("playMention")
    replacement = "const { " + ", ".join(names) + " } = useActionSounds();"
    text = text[: match.start()] + replacement + text[match.end() :]

    anchor = (
        "        const isNewMessage = "
        "!hasKnownMessage(knownMessageKeys, event.payload);\n"
    )
    if anchor not in text:
        raise RuntimeError("Point de branchement de la mention temps réel introuvable.")
    mention_logic = (
        "        if (\n"
        '          event.type === "message.created" &&\n'
        "          isNewMessage &&\n"
        "          event.payload.senderId !== currentUser.id &&\n"
        "          event.payload.mentionedUserIds?.includes(currentUser.id)\n"
        "        ) {\n"
        "          void playMention();\n"
        "        }\n"
    )
    text = text.replace(anchor, anchor + mention_logic, 1)
    write(path, text)


def patch_theme() -> None:
    path = "src/theme/index.ts"
    text = read(path)
    text = text.replace(
        '  body: {\n    fontSize: 15,\n    lineHeight: 21,',
        '  body: {\n    fontSize: 16,\n    lineHeight: 24,',
    )
    text = text.replace(
        '  bodySmall: {\n    fontSize: 13,\n    lineHeight: 18,',
        '  bodySmall: {\n    fontSize: 14,\n    lineHeight: 20,',
    )
    write(path, text)


def patch_map_file(path: str, native: bool) -> None:
    text = read(path)
    if "domain/roleAppearance" not in text:
        if native:
            marker = 'import { colors, radii } from "../theme";\n'
        else:
            marker = 'import type { NeptuneMapProps } from "./NeptuneMap.types";\n'
        if marker not in text:
            raise RuntimeError(f"{path}: point d'import de statut introuvable.")
        insertion = 'import { getRoleAppearance } from "../domain/roleAppearance";\n'
        text = text.replace(marker, insertion + marker, 1)

    marker_pattern = re.compile(
        r"    const markerData = moments\.map\(\(moment\) => \(\{.*?    \}\)\);",
        re.S,
    )
    marker_replacement = """    const markerData = moments.map((moment) => {
      const roleAppearance = getRoleAppearance(moment.member.role);
      return {
        id: moment.member.id,
        name: moment.member.name,
        initials: moment.member.initials,
        avatarUrl: moment.member.avatarUrl ?? null,
        roleColor: roleAppearance.border,
        roleBackground: roleAppearance.background,
        latitude: moment.latitude,
        longitude: moment.longitude,
        pulse: moment.recentPostIds.length > 0
      };
    });"""
    if not marker_pattern.search(text):
        raise RuntimeError(f"{path}: génération markerData introuvable.")
    text = marker_pattern.sub(marker_replacement, text, count=1)

    click_js = (
        "window.ReactNativeWebView.postMessage(JSON.stringify({type:'member-selected',memberId:member.id}))"
        if native
        else "window.parent.postMessage({source:'connexio-map',type:'member-selected',memberId:member.id},'*')"
    )
    map_loop = f"""members.forEach(member=>{{
 const avatarMarkup=member.avatarUrl?'<img src=\"'+escapeText(member.avatarUrl)+'\" alt=\"\" />':escapeText(member.initials);
 const roleColor=escapeText(member.roleColor||'#431E73');
 const roleBackground=escapeText(member.roleBackground||'#150D33');
 const html='<div class=\"member-marker '+(member.pulse?'pulse':'')+'\" data-member-id=\"'+escapeText(member.id)+'\"><div class=\"member-core\" style=\"background:'+roleColor+'\"><div class=\"member-inner\" style=\"background:'+roleBackground+'\">'+avatarMarkup+'</div></div></div>';
 const marker=L.marker([member.latitude,member.longitude],{{icon:L.divIcon({{className:'',html,iconSize:[58,58],iconAnchor:[29,29]}}),title:member.name}});
 marker.on('add',()=>{{const node=marker.getElement()?.querySelector('.member-marker');if(node)markerNodes.set(member.id,node)}});
 marker.on('click',()=>{click_js});
 marker.bindTooltip(escapeText(member.name),{{direction:'bottom',offset:[0,23],opacity:.92}});
 cluster.addLayer(marker);bounds.push([member.latitude,member.longitude]);
}});
map.addLayer(cluster);"""
    loop_pattern = re.compile(
        r"members\.forEach\(member=>\{.*?\}\);\s*map\.addLayer\(cluster\);", re.S
    )
    if not loop_pattern.search(text):
        raise RuntimeError(f"{path}: boucle de marqueurs introuvable.")
    text = loop_pattern.sub(lambda _: map_loop, text, count=1)

    text = text.replace(
        ".member-core{width:44px;height:44px",
        ".member-core{width:48px;height:48px",
    )
    text = text.replace(
        ".member-core{width:46px;height:46px",
        ".member-core{width:48px;height:48px",
    )
    text = text.replace("width:44px;height:44px", "width:48px;height:48px")
    text = text.replace("width:46px;height:46px", "width:48px;height:48px")
    text = re.sub(r"\bwidth: 44,\n\s*height: 44,", "width: 48,\n    height: 48,", text)
    write(path, text)


def patch_maps() -> None:
    patch_map_file("src/components/NeptuneMap.web.tsx", native=False)
    patch_map_file("src/components/NeptuneMap.native.tsx", native=True)


def patch_numeric_design_tokens(text: str) -> str:
    text = re.sub(
        r"\b(minHeight|minWidth|width|height):\s*(44|46)\b",
        lambda match: f"{match.group(1)}: 48",
        text,
    )
    text = re.sub(
        r"\b(gap|rowGap|columnGap):\s*([4-7])\b",
        lambda match: f"{match.group(1)}: 8",
        text,
    )

    def font_replacement(match: re.Match[str]) -> str:
        value = float(match.group(1))
        if value < 11:
            target = "11"
        elif value in (12, 13):
            target = "14"
        elif value == 15:
            target = "16"
        else:
            return match.group(0)
        return f"fontSize: {target}"

    return re.sub(r"fontSize:\s*(\d+(?:\.\d+)?)\b", font_replacement, text)


def patch_input_style_blocks(text: str) -> str:
    block_pattern = re.compile(
        r"(?P<head>\n\s*(?P<name>[A-Za-z0-9_]*(?:input|Input|composer|Composer|textarea|Textarea|field|Field|search|Search)[A-Za-z0-9_]*)\s*:\s*\{)"
        r"(?P<body>.*?)(?P<tail>\n\s*\},)",
        re.S,
    )

    def replace_block(match: re.Match[str]) -> str:
        body = match.group("body")
        if re.search(r"\bfontSize:\s*\d+(?:\.\d+)?", body):
            body = re.sub(r"\bfontSize:\s*\d+(?:\.\d+)?", "fontSize: 16", body)
        else:
            body += "\n    fontSize: 16,"
        if re.search(r"\bminHeight:\s*\d+", body):
            body = re.sub(r"\bminHeight:\s*(?:[0-4]?\d)\b", "minHeight: 48", body)
        return match.group("head") + body + match.group("tail")

    return block_pattern.sub(replace_block, text)


def patch_all_design_sources() -> None:
    for folder in ("app", "src"):
        for path in (ROOT / folder).rglob("*.tsx"):
            text = path.read_text(encoding="utf-8")
            updated = patch_input_style_blocks(patch_numeric_design_tokens(text))
            if updated != text:
                path.write_text(updated, encoding="utf-8")

    path = ROOT / "src/components/NeptuneTabBar.tsx"
    if path.exists():
        text = path.read_text(encoding="utf-8")
        text = text.replace("fontSize: 9.5", "fontSize: 11")
        text = text.replace("fontSize: 9,", "fontSize: 11,")
        path.write_text(text, encoding="utf-8")

    path = ROOT / "app/notification-settings.tsx"
    text = path.read_text(encoding="utf-8")
    old_switch = """                  <Switch
                    accessibilityLabel={row.title}
                    disabled={Boolean(savingKey)}
                    value={preferences[row.key]}
                    onValueChange={(value) =>
                      void updatePreference(row.key, value)
                    }
                    trackColor={{
                      false: colors.surfaceMuted,
                      true: colors.primary
                    }}
                    thumbColor={colors.white}
                  />"""
    new_switch = """                  <Pressable
                    accessibilityRole="switch"
                    accessibilityLabel={row.title}
                    accessibilityState={{ checked: preferences[row.key], disabled: Boolean(savingKey) }}
                    disabled={Boolean(savingKey)}
                    onPress={() => void updatePreference(row.key, !preferences[row.key])}
                    style={styles.switchTarget}
                  >
                    <Switch
                      pointerEvents="none"
                      value={preferences[row.key]}
                      trackColor={{
                        false: colors.surfaceMuted,
                        true: colors.primary
                      }}
                      thumbColor={colors.white}
                    />
                  </Pressable>"""
    if old_switch in text:
        text = text.replace(old_switch, new_switch, 1)
    if "switchTarget:" not in text:
        marker = "  switchLoader: {\n"
        if marker not in text:
            raise RuntimeError("Style switchLoader introuvable.")
        style = (
            "  switchTarget: {\n"
            "    width: 48,\n"
            "    height: 48,\n"
            '    alignItems: "center",\n'
            '    justifyContent: "center"\n'
            "  },\n"
        )
        text = text.replace(marker, style + marker, 1)
    write("app/notification-settings.tsx", text)


def patch_visual_audit() -> None:
    path = "scripts/visual-audit.cjs"
    text = read(path)

    if 'messages-360x800' not in text:
        anchor = '{ name: "messages-390x844", width: 390, height: 844, route: "/" },'
        if anchor not in text:
            raise RuntimeError("Cas visuel messages 390×844 introuvable.")
        text = text.replace(
            anchor,
            '{ name: "messages-360x800", width: 360, height: 800, route: "/" },\n'
            '  { name: "messages-390x844", width: 390, height: 844, route: "/" },\n'
            '  { name: "messages-393x852", width: 393, height: 852, route: "/" },',
            1,
        )

    if "account-390x844" not in text:
        anchor = '  { name: "highlights-feed-280x568", width: 280, height: 568, route: "/highlights" },'
        if anchor not in text:
            raise RuntimeError("Point d'insertion des écrans UX introuvable.")
        rendered = "\n".join(
            [
                '  { name: "contacts-360x800", width: 360, height: 800, route: "/contacts" },',
                '  { name: "account-390x844", width: 390, height: 844, route: "/account" },',
                '  { name: "privacy-393x852", width: 393, height: 852, route: "/privacy" },',
                '  { name: "notifications-360x800", width: 360, height: 800, route: "/notification-settings" },',
                '  { name: "blocked-users-390x844", width: 390, height: 844, route: "/blocked-users" },',
                '  { name: "new-highlight-393x852", width: 393, height: 852, route: "/new-highlight" },',
            ]
        )
        text = text.replace(anchor, rendered + "\n" + anchor, 1)

    text = text.replace("rect.width < 44 || rect.height < 44", "rect.width < 48 || rect.height < 48")

    old_control_map = """      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          element,
          rect,
          label: label(element)
        };
      })"""
    new_control_map = """      .map((element) => {
        const ownRect = element.getBoundingClientRect();
        const interactiveParent = element.parentElement?.closest?.('[role="button"], [role="switch"], button, a[href]');
        const parentRect = interactiveParent && interactiveParent !== element
          ? interactiveParent.getBoundingClientRect()
          : null;
        const rect = parentRect && parentRect.width >= 48 && parentRect.height >= 48
          ? parentRect
          : ownRect;
        return {
          element,
          rect,
          label: label(element)
        };
      })"""
    if old_control_map in text:
        text = text.replace(old_control_map, new_control_map, 1)

    if "const typographyIssues =" not in text:
        return_anchor = "    return {\n      viewportWidth,\n"
        if return_anchor not in text:
            raise RuntimeError("Retour de l'audit visuel introuvable.")
        audit = """    const typographyIssues = allElements
      .filter((element) => {
        const tag = element.tagName.toLowerCase();
        const isInput = ["input", "textarea", "select"].includes(tag);
        const value = (element.textContent || element.getAttribute("placeholder") || "").trim();
        if (!isInput && (!value || element.children.length > 0)) return false;
        const fontSize = Number.parseFloat(getComputedStyle(element).fontSize);
        if (!Number.isFinite(fontSize)) return false;
        if (isInput) return fontSize < 16;
        if (fontSize < 11) return true;
        return value.length > 32 && fontSize < 14;
      })
      .slice(0, 40)
      .map((element) => ({
        label: label(element),
        fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
        tag: element.tagName.toLowerCase()
      }));

    const controlSpacingIssues = [];
    for (let index = 0; index < controlRects.length; index += 1) {
      for (let nextIndex = index + 1; nextIndex < controlRects.length; nextIndex += 1) {
        const first = controlRects[index];
        const second = controlRects[nextIndex];
        if (first.element.contains(second.element) || second.element.contains(first.element)) continue;
        if (first.element.getAttribute("role") === "tab" || second.element.getAttribute("role") === "tab") continue;
        const a = first.rect;
        const b = second.rect;
        if (a.width > 96 || b.width > 96 || a.height > 96 || b.height > 96) continue;
        const verticalOverlap = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        const horizontalOverlap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const horizontalGap = Math.max(a.left, b.left) - Math.min(a.right, b.right);
        const verticalGap = Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom);
        const tooCloseHorizontally = verticalOverlap > Math.min(a.height, b.height) * 0.45 && horizontalGap >= 0 && horizontalGap < 8;
        const tooCloseVertically = horizontalOverlap > Math.min(a.width, b.width) * 0.45 && verticalGap >= 0 && verticalGap < 8;
        if (tooCloseHorizontally || tooCloseVertically) {
          controlSpacingIssues.push({ first: first.label, second: second.label, gap: Number(Math.max(horizontalGap, verticalGap).toFixed(2)) });
        }
      }
    }

"""
        text = text.replace(return_anchor, audit + return_anchor, 1)
        text = text.replace(
            "      textOverflow\n    };",
            "      textOverflow,\n      typographyIssues,\n      controlSpacingIssues\n    };",
            1,
        )
        text = text.replace(
            "finding.metrics.textOverflow.length > 0 ||",
            "finding.metrics.textOverflow.length > 0 ||\n"
            "      finding.metrics.typographyIssues.length > 0 ||\n"
            "      finding.metrics.controlSpacingIssues.length > 0 ||",
            1,
        )

    write(path, text)


def patch_eas_and_docs() -> None:
    path = ROOT / "eas.json"
    eas = json.loads(path.read_text(encoding="utf-8"))
    for profile_name in ("release-candidate", "production"):
        profile = eas["build"][profile_name]
        profile.setdefault("ios", {})["image"] = "sdk-57"
        profile.setdefault("android", {})["image"] = "sdk-57"
    path.write_text(json.dumps(eas, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    checklist = ROOT / "docs/STORE_RELEASE_CHECKLIST.md"
    checklist.write_text(
        """# Connexio — contrôle de publication stores

## Contrôles automatisés

- Expo SDK 57, Android API 36 et image EAS `sdk-57`.
- Image iOS EAS `sdk-57`, compatible Xcode 26 et SDK iOS 26.
- Prébuild iOS et Android reproductible.
- Manifest de confidentialité iOS présent et syntaxiquement valide.
- Permissions sensibles documentées.
- Politique de confidentialité, assistance et suppression de compte obligatoires.
- Sons natifs de notification et de mention embarqués.
- APK de contrôle ciblant l’API 36 et vérifié pour l’alignement 16 Ko.
- Audit visuel 360×800, 390×844 et 393×852.
- Zones tactiles minimales 48×48, champs à 16 px, textes courts ≥11 px et textes longs ≥14 px.
- TypeScript, tests métier, audit RC, build web et audit responsive.

## Éléments manuels avant soumission

### App Store Connect

- Compte de démonstration stable et instructions de revue.
- Réponses App Privacy conformes au backend et aux SDK réellement déployés.
- Questionnaire de classification d’âge.
- Captures demandées pour tous les appareils pris en charge.
- Coordonnées d’assistance et notes de revue.

### Google Play Console

- Compte de démonstration dans « Accès à l’application ».
- Formulaire « Sécurité des données » conforme au backend et aux SDK.
- Politique de confidentialité, suppression de compte et classification du contenu.
- Déclarations relatives aux permissions sensibles.
- Test interne ou fermé avant production.

## Contrôles externes indispensables

- Build signé réel avec les identifiants Apple et Google de Neptune.
- APNs et FCM testés sur appareils physiques.
- Appels audio/vidéo testés en Wi‑Fi, 4G/5G et via TURN de production.
- Backend de production disponible sans données fictives.
- Validation finale des déclarations de collecte avec le responsable RGPD.
""",
        encoding="utf-8",
    )


def main() -> None:
    patch_message_bubble()
    patch_messaging_provider()
    patch_theme()
    patch_maps()
    patch_all_design_sources()
    patch_visual_audit()
    patch_eas_and_docs()


if __name__ == "__main__":
    main()
