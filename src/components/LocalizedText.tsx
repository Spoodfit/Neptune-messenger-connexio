import { type ReactNode } from "react";
import { Text as NativeText, type TextProps } from "react-native";

import { translateUiText } from "../i18n/uiTranslations";
import { useAppLanguage } from "../providers/LanguageProvider";

function translateNode(node: ReactNode, language: string): ReactNode {
  if (typeof node === "string") return translateUiText(node, language);
  if (Array.isArray(node)) return node.map((item, index) => <FragmentNode key={index} node={item} language={language} />);
  return node;
}

function FragmentNode({ node, language }: { node: ReactNode; language: string }) {
  return <>{translateNode(node, language)}</>;
}

function localize(value: unknown, language: string) {
  return typeof value === "string" ? translateUiText(value, language) : value;
}

/**
 * Drop-in React Native Text replacement for bundled interface copy.
 * All application Text imports are redirected here at build time.
 */
export function Text({ children, accessibilityLabel, accessibilityHint, ...props }: TextProps) {
  const { uiLanguage } = useAppLanguage();
  return (
    <NativeText
      key={`connexio-ui-text:${uiLanguage}`}
      {...props}
      accessibilityLabel={localize(accessibilityLabel, uiLanguage) as TextProps["accessibilityLabel"]}
      accessibilityHint={localize(accessibilityHint, uiLanguage) as TextProps["accessibilityHint"]}
    >
      {translateNode(children, uiLanguage)}
    </NativeText>
  );
}
