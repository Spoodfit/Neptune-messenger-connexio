import { Slot } from "expo-router";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";

import { ChatLoadingOverlay } from "@/components/ChatLoadingOverlay";
import { SkeletonPulseGroup } from "@/components/SkeletonPulseGroup";

export default function ChatLayout() {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
      style={styles.root}
    >
      <Slot />
      <SkeletonPulseGroup>
        <ChatLoadingOverlay />
      </SkeletonPulseGroup>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }
});
