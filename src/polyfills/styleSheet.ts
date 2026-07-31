import { StyleSheet } from "react-native";

const compatibleStyleSheet = StyleSheet as typeof StyleSheet & {
  absoluteFillObject?: typeof StyleSheet.absoluteFill;
};

if (!compatibleStyleSheet.absoluteFillObject) {
  Object.defineProperty(compatibleStyleSheet, "absoluteFillObject", {
    value: StyleSheet.absoluteFill,
    enumerable: false,
    configurable: false,
    writable: false
  });
}
