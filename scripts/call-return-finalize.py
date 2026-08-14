from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def replace(path: str, old: str, new: str, expected: int = 1) -> None:
    target = ROOT / path
    text = target.read_text()
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{path}: expected {expected}, found {count}: {old[:100]!r}")
    target.write_text(text.replace(old, new, expected))

# Call room: retain a safe explicit in-app return target instead of unwinding Android navigation.
replace(
    "app/call/[id].tsx",
    '    scheduled?: string;\n  }>();',
    '    scheduled?: string;\n    returnTo?: string;\n  }>();',
)
replace(
    "app/call/[id].tsx",
    '  const scheduled = first(params.scheduled) === "1" && initialReason.trim().length >= 3;\n  const conversation = getConversation(conversationId);',
    '  const scheduled = first(params.scheduled) === "1" && initialReason.trim().length >= 3;\n  const requestedReturnTo = first(params.returnTo);\n  const returnTo = requestedReturnTo && requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("/call/")\n    ? requestedReturnTo\n    : conversationId ? `/chat/${encodeURIComponent(conversationId)}` : "/(tabs)/calls";\n  const conversation = getConversation(conversationId);',
)
replace(
    "app/call/[id].tsx",
    '    router.replace(conversationId ? `/chat/${encodeURIComponent(conversationId)}` : "/(tabs)/calls");',
    '    router.replace(returnTo as never);',
)

# Every known call launcher states exactly where hangup should go.
replace(
    "app/profile/[id].tsx",
    'try { const conversation = await ensureConversation(); router.push({ pathname: "/call/[id]", params: { id: conversation.id, mode } }); }',
    'try { const conversation = await ensureConversation(); router.push({ pathname: "/call/[id]", params: { id: conversation.id, mode, returnTo: `/profile/${encodeURIComponent(member.id)}` } }); }',
)
replace(
    "app/(tabs)/calls.tsx",
    '          ...(scheduled ? { scheduled: "1" } : {})\n        }',
    '          ...(scheduled ? { scheduled: "1" } : {}),\n          returnTo: "/(tabs)/calls"\n        }',
)
replace(
    "app/(tabs)/highlights.tsx",
    'else router.push({ pathname: "/call/[id]", params: { id: conversation.id, mode: action } });',
    'else router.push({ pathname: "/call/[id]", params: { id: conversation.id, mode: action, returnTo: "/(tabs)/highlights" } });',
)
replace(
    "src/screens/ChatConversationScreen.tsx",
    'params: { id: conversation.id, mode: "audio" }',
    'params: { id: conversation.id, mode: "audio", returnTo: `/chat/${encodeURIComponent(conversation.id)}` }',
)
replace(
    "src/screens/ChatConversationScreen.tsx",
    'params: { id: conversation.id, mode: "video" }',
    'params: { id: conversation.id, mode: "video", returnTo: `/chat/${encodeURIComponent(conversation.id)}` }',
)
replace(
    "app/_layout.tsx",
    'reason: typeof data.reason === "string" ? data.reason : "Appel programmé", scheduled: "1", autoStart: env.mockMode ? "1" : "0" }',
    'reason: typeof data.reason === "string" ? data.reason : "Appel programmé", scheduled: "1", autoStart: env.mockMode ? "1" : "0", returnTo: "/(tabs)/calls" }',
)

# The separate floating back control is intentionally absent while a call is live.
replace(
    "src/components/FloatingBackButton.tsx",
    'const HIDDEN_ROOTS = new Set(["(tabs)", "sign-in", "access-help"]);',
    'const HIDDEN_ROOTS = new Set(["(tabs)", "sign-in", "access-help", "call"]);',
)

print("call return navigation finalized")
