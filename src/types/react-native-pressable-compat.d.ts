import "react-native";

declare module "react-native" {
  interface PressableProps {
    acessibilityLabel?: string;
  }
}
