from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "src/providers/ExperienceProvider.tsx"
content = PATH.read_text(encoding="utf-8")

access_import = '''import {
  canInitiatePrivateInteraction,
  canPublishHighlightKind,
  canPublishInConversation
} from "../domain/accessPolicy";
'''
if access_import not in content:
    anchor = 'import { env } from "../config/env";\n'
    if anchor not in content:
        raise RuntimeError("Import env introuvable dans ExperienceProvider")
    content = content.replace(anchor, anchor + access_import, 1)

# Remove every misplaced highlight restriction before reinserting it at the
# exact createPost boundary. Previous staging passes could place this block in
# createPrivateConversation because both callbacks use an `input` parameter.
misplaced = re.compile(
    r'\n\s*if \(!canPublishHighlightKind\(currentUser\.role, input\.kind\)\) \{\n'
    r'\s*throw new Error\("Un compte Free peut publier uniquement un Besoin\."\);\n'
    r'\s*\}',
    re.M,
)
content = misplaced.sub("", content)

create_post_anchor = '''  const createPost = useCallback(
    (input: CreatePostInput): HighlightPost => {
'''
if create_post_anchor not in content:
    raise RuntimeError("Callback createPost introuvable")
content = content.replace(
    create_post_anchor,
    create_post_anchor
    + '''      if (!canPublishHighlightKind(currentUser.role, input.kind)) {
        throw new Error("Un compte Free peut publier uniquement un Besoin.");
      }
''',
    1,
)

private_anchor = '''  const createPrivateConversation = useCallback(
    (draft: PrivateConversationDraft): Conversation => {
'''
private_guard = '''      if (!canInitiatePrivateInteraction(currentUser.role)) {
        throw new Error("Un compte Free ne peut pas initier une conversation privée.");
      }
'''
if private_anchor not in content:
    raise RuntimeError("Callback createPrivateConversation introuvable")
private_section_start = content.index(private_anchor)
private_section_end = content.index("  const sendLocalMessage", private_section_start)
private_section = content[private_section_start:private_section_end]
if private_guard not in private_section:
    content = content.replace(private_anchor, private_anchor + private_guard, 1)

send_pattern = '''      if (
        !conversation ||
'''
if send_pattern not in content:
    raise RuntimeError("Validation sendLocalMessage introuvable")
if "!canPublishInConversation(currentUser, conversation)" not in content:
    content = content.replace(
        send_pattern,
        '''      if (
        !conversation ||
        !canPublishInConversation(currentUser, conversation) ||
''',
        1,
    )

old_override = '''        restricted: true,
        canPost: draft.canMembersPost
'''
new_override = '''        restricted: true,
        canPost: draft.canMembersPost,
        adminIds: draft.adminIds,
        announcementPublisherIds: draft.announcementPublisherIds,
        allowFreeDiscovery: draft.allowFreeDiscovery
'''
if old_override in content:
    content = content.replace(old_override, new_override, 1)

# Keep hook dependencies correct after role-aware guards were introduced.
content = content.replace(
    "    [currentUser.id, localConversations, members]\n  );",
    "    [currentUser, localConversations, members]\n  );",
    1,
)

PATH.write_text(content.rstrip() + "\n", encoding="utf-8")
print("ExperienceProvider normalisé pour la RC1.")
