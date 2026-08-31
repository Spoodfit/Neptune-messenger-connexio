import { Redirect } from "expo-router";

import { useSession } from "../src/providers/SessionProvider";
import { capabilitiesForBackendContract } from "../src/config/backendCapabilities";
import { env } from "../src/config/env";

const BACKEND_CAPABILITIES = capabilitiesForBackendContract(env.backendContract);
const MESSAGING_AVAILABLE = env.mockMode || BACKEND_CAPABILITIES.messaging;

export default function IndexRoute() {
  const { isAuthenticated } = useSession();
  return (
    <Redirect
      href={
        isAuthenticated
          ? MESSAGING_AVAILABLE
            ? "/(tabs)/messages"
            : "/(tabs)/highlights"
          : "/sign-in"
      }
    />
  );
}
