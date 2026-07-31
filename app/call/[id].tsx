import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";

import CallSurface from "@/components/CallSurface";
import { useSession } from "@/providers/SessionProvider";
import type { CallMode } from "@/services/calls/callRoom";

export default function CallRoomScreen() {
  const params = useLocalSearchParams<{ id: string; mode?: string }>();
  const { currentUser } = useSession();
  const conversationId = useMemo(
    () =>
      Array.isArray(params.id)
        ? (params.id[0] ?? "")
        : (params.id ?? ""),
    [params.id]
  );
  const mode: CallMode = params.mode === "audio" ? "audio" : "video";

  return (
    <CallSurface
      conversationId={conversationId}
      mode={mode}
      displayName={currentUser.name}
      onClose={() => router.back()}
    />
  );
}
