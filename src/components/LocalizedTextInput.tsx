import { forwardRef, type ElementRef } from "react";
import { TextInput as NativeTextInput, type TextInputProps } from "react-native";

import { translateUiText } from "../i18n/uiTranslations";
import { useAppLanguage } from "../providers/LanguageProvider";

export type TextInput = ElementRef<typeof NativeTextInput>;

function localize(value: unknown, language: string) {
  return typeof value === "string" ? translateUiText(value, language) : value;
}

export const TextInput = forwardRef<TextInput, TextInputProps>(function LocalizedTextInput(
  { placeholder, accessibilityLabel, accessibilityHint, ...props },
  ref
) {
  const { uiLanguage } = useAppLanguage();
  return (
    <NativeTextInput
      {...props}
      ref={ref}
      placeholder={localize(placeholder, uiLanguage) as TextInputProps["placeholder"]}
      accessibilityLabel={localize(accessibilityLabel, uiLanguage) as TextInputProps["accessibilityLabel"]}
      accessibilityHint={localize(accessibilityHint, uiLanguage) as TextInputProps["accessibilityHint"]}
    />
  );
});
