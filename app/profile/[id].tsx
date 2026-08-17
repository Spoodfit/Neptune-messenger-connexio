import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import MemberProfileScreenV19 from "@/screens/MemberProfileScreenV19";

export default function MemberProfileRoute() {
  const insets = useSafeAreaInsets();
  const extraTop = Platform.OS === "android" ? Math.max(6, insets.top > 0 ? 4 : 8) : 4;
  return <View style={{ flex: 1, paddingTop: extraTop }}><MemberProfileScreenV19 /></View>;
}
