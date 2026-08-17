import { type ReactNode } from "react";
import { Text as NativeText, type TextProps } from "react-native";

import { translateConnexioUiText } from "../i18n/uiTranslator";
import { useAppLanguage } from "../providers/LanguageProvider";

function isPrimitiveTextNode(node: ReactNode): boolean {
  return typeof node === "string" || typeof node === "number";
}

function translateNode(node: ReactNode, language: string): ReactNode {
  if (typeof node === "string") return translateConnexioUiText(node, language);
  if (Array.isArray(node)) {
    // React splits dynamic labels such as "3 publications" into several children.
    // Recompose primitive-only sequences before translation so pluralisation works
    // as a complete phrase instead of translating isolated French fragments.
    if (node.every(isPrimitiveTextNode)) {
      const combined = node.map((item) => String(item ?? "")).join("");
      return translateConnexioUiText(combined, language);
    }
    return node.map((item, index) => <FragmentNode key={index} node={item} language={language} />);
  }
  return node;
}

function FragmentNode({ node, language }: { node: ReactNode; language: string }) {
  return <>{translateNode(node, language)}</>;
}

function localize(value: unknown, language: string) {
  return typeof value === "string" ? translateConnexioUiText(value, language) : value;
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
