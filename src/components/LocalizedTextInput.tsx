import { forwardRef, type ElementRef } from "react";
import { TextInput as NativeTextInput, type TextInputProps } from "react-native";

import { translateUiText } from "../i18n/uiTranslations";
import { useAppLanguage } from "../providers/LanguageProvider";

export type TextInput = ElementRef<typeof NativeTextInput>;

export const TextInput = forwardRef<TextInput, TextInputProps>(function LocalizedTextInput(
  { placeholder, ...props },
  ref
) {
  const { language } = useAppLanguage();
  return (
    <NativeTextInput
      {...props}
      ref={ref}
      placeholder={typeof placeholder === "string" ? translateUiText(placeholder, language) : placeholder}
    />
  );
});
