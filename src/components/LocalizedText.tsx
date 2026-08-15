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

/**
 * Drop-in React Native Text replacement for bundled interface copy.
 * Only exact, known UI strings are translated, so member messages, names and
 * other user-generated content are never machine-mutated by this layer.
 */
export function Text({ children, ...props }: TextProps) {
  const { language } = useAppLanguage();
  return <NativeText {...props}>{translateNode(children, language)}</NativeText>;
}
