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
 *
 * The component listens to uiLanguage (not to the message-translation locale)
 * and keys the native host node by locale. The key deliberately forces React
 * Native to recreate the native text node when the app language changes, which
 * avoids stale host-text rendering on a physical Android/iOS build.
 *
 * Only exact, known UI strings are translated by the bundled catalogue.
 */
export function Text({ children, ...props }: TextProps) {
  const { uiLanguage } = useAppLanguage();
  return (
    <NativeText key={`connexio-ui-text:${uiLanguage}`} {...props}>
      {translateNode(children, uiLanguage)}
    </NativeText>
  );
}
