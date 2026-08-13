import { Slot } from "expo-router";
import { StyleSheet, View } from "react-native";

import { ChatLoadingOverlay } from "@/components/ChatLoadingOverlay";

export default function ChatLayout() {
  return (
    <View style={styles.root}>
      <Slot />
      <ChatLoadingOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }
});
