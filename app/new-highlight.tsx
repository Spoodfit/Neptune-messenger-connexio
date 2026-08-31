import { Redirect } from "expo-router";

export default function NewHighlightRedirect() {
  return <Redirect href={{ pathname: "/(tabs)/highlights", params: { compose: "1", composeNonce: String(Date.now()) } }} />;
}
