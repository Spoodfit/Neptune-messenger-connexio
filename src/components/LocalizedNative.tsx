import { forwardRef, type ElementRef } from "react";
import {
  Button as NativeButton,
  Pressable as NativePressable,
  type ButtonProps,
  type PressableProps
} from "react-native";

import { translateUiText } from "../i18n/uiTranslations";
import { useAppLanguage } from "../providers/LanguageProvider";
import { Text } from "./LocalizedText";
import { TextInput } from "./LocalizedTextInput";

export { Text, TextInput };

function localize(value: unknown, language: string) {
  return typeof value === "string" ? translateUiText(value, language) : value;
}

type PressableRef = ElementRef<typeof NativePressable>;

export const Pressable = forwardRef<PressableRef, PressableProps>(function LocalizedPressable(
  { accessibilityLabel, accessibilityHint, ...props },
  ref
) {
  const { uiLanguage } = useAppLanguage();
  return (
    <NativePressable
      {...props}
      ref={ref}
      accessibilityLabel={localize(accessibilityLabel, uiLanguage) as PressableProps["accessibilityLabel"]}
      accessibilityHint={localize(accessibilityHint, uiLanguage) as PressableProps["accessibilityHint"]}
    />
  );
});

export function Button({ title, accessibilityLabel, accessibilityHint, ...props }: ButtonProps) {
  const { uiLanguage } = useAppLanguage();
  return (
    <NativeButton
      {...props}
      title={translateUiText(title, uiLanguage)}
      accessibilityLabel={localize(accessibilityLabel, uiLanguage) as ButtonProps["accessibilityLabel"]}
      accessibilityHint={localize(accessibilityHint, uiLanguage) as ButtonProps["accessibilityHint"]}
    />
  );
}
