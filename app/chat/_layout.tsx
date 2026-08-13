import { Slot } from "expo-router";
import { StyleSheet, View } from "react-native";

import { ChatLoadingOverlay } from "@/components/ChatLoadingOverlay";
import { SkeletonPulseGroup } from "@/components/SkeletonPulseGroup";

export default function ChatLayout() {
  return (
    <View style={styles.root}>
      <Slot />
      <SkeletonPulseGroup>
        <ChatLoadingOverlay />
      </SkeletonPulseGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }
});
