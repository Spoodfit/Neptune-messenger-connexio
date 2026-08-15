import { TextInput as NativeTextInput, type TextInputProps } from "react-native";

import { translateUiText } from "../i18n/uiTranslations";
import { useAppLanguage } from "../providers/LanguageProvider";

/** Localizes bundled placeholders while leaving typed/user content untouched. */
export function TextInput({ placeholder, ...props }: TextInputProps) {
  const { language } = useAppLanguage();
  return (
    <NativeTextInput
      {...props}
      placeholder={typeof placeholder === "string" ? translateUiText(placeholder, language) : placeholder}
    />
  );
}
