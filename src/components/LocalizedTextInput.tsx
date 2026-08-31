import { forwardRef, type ElementRef } from "react";
import { TextInput as NativeTextInput, type TextInputProps } from "react-native";

import { translateConnexioUiText } from "../i18n/uiTranslator";
import { useAppLanguage } from "../providers/LanguageProvider";

export type TextInput = ElementRef<typeof NativeTextInput>;

function localize(value: unknown, language: string) {
  return typeof value === "string" ? translateConnexioUiText(value, language) : value;
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
