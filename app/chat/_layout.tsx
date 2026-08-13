import { Stack } from "expo-router";

import { StandalonePersistenceBridge } from "@/components/StandalonePersistenceBridge";

export default function ChatLayout() {
  return (
    <>
      <StandalonePersistenceBridge />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
