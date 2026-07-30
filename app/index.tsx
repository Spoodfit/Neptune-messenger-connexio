import { Redirect } from "expo-router";

import { useSession } from "../src/providers/SessionProvider";

export default function IndexRoute() {
  const { isAuthenticated } = useSession();
  return <Redirect href={isAuthenticated ? "/(tabs)/messages" : "/sign-in"} />;
}
