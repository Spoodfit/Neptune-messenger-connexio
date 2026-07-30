import type { ViewStyle } from "react-native";
import "react-native";

declare module "react-native" {
  interface StyleSheetStatic {
    readonly absoluteFillObject: ViewStyle;
  }
}
