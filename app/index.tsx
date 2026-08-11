import { Redirect } from "expo-router";

import { useSession } from "../src/providers/SessionProvider";
import { capabilitiesForBackendContract } from "../src/config/backendCapabilities";
import { env } from "../src/config/env";

const BACKEND_CAPABILITIES = capabilitiesForBackendContract(env.backendContract);

export default function IndexRoute() {
  const { isAuthenticated } = useSession();
  return (
    <Redirect
      href={
        isAuthenticated
          ? BACKEND_CAPABILITIES.messaging
            ? "/(tabs)/messages"
            : "/(tabs)/highlights"
          : "/sign-in"
      }
    />
  );
}
