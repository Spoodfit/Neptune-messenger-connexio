const LOCALIZED_IMPORT = "@/components/LocalizedNative";
const UI_LOCALE_IMPORT = "@/i18n/uiLocale";
const CONTENT_TEXT_IMPORT = "@/i18n/runtimeContentText";
const UI_LOCALE_LOCAL = "__connexioUiLocaleTag";
const CONTENT_TEXT_LOCAL = "__connexioTranslateContentText";
const TARGETS = new Set(["Text", "TextInput", "Pressable", "Button"]);
const DATE_METHODS = new Set(["toLocaleString", "toLocaleDateString", "toLocaleTimeString"]);
const CONTENT_FIELDS = new Set(["body", "description", "lastMessage", "pinnedMessage", "title", "transcript"]);
const EXCLUDED_FILES = new Set([
  "src/components/LocalizedNative.tsx",
  "src/components/LocalizedText.tsx",
  "src/components/LocalizedTextInput.tsx",
  "src/i18n/runtimeContentText.ts"
]);

function isFrenchLocaleLiteral(t, node) {
  return t.isStringLiteral(node) && /^(fr|fr-FR)$/i.test(node.value);
}

module.exports = function connexioI18nPlugin({ types: t }) {
  return {
    name: "connexio-global-i18n",
    visitor: {
      Program(programPath, state) {
        const filename = state.file.opts.filename || "";
        const normalized = filename.replace(/\\/g, "/");
        const cwd = String(state.file.opts.cwd || process.cwd()).replace(/\\/g, "/").replace(/\/$/, "");
        const relative = normalized.startsWith(`${cwd}/`) ? normalized.slice(cwd.length + 1) : normalized;

        if (!(relative.startsWith("app/") || relative.startsWith("src/"))) return;
        if (EXCLUDED_FILES.has(relative)) return;
        if (relative.includes("/node_modules/")) return;

        const localizedSpecifiers = [];
        const existingLocalizedLocals = new Set();

        for (const statement of programPath.get("body")) {
          if (!statement.isImportDeclaration()) continue;
          if (statement.node.source.value === LOCALIZED_IMPORT) {
            for (const specifier of statement.node.specifiers) {
              if (t.isImportSpecifier(specifier)) existingLocalizedLocals.add(specifier.local.name);
            }
          }
        }

        for (const statement of programPath.get("body")) {
          if (!statement.isImportDeclaration()) continue;
          if (statement.node.source.value !== "react-native") continue;

          const keep = [];
          for (const specifier of statement.node.specifiers) {
            if (!t.isImportSpecifier(specifier)) {
              keep.push(specifier);
              continue;
            }
            const imported = t.isIdentifier(specifier.imported) ? specifier.imported.name : specifier.imported.value;
            if (!TARGETS.has(imported)) {
              keep.push(specifier);
              continue;
            }
            if (!existingLocalizedLocals.has(specifier.local.name)) {
              localizedSpecifiers.push(t.importSpecifier(t.identifier(specifier.local.name), t.identifier(imported)));
              existingLocalizedLocals.add(specifier.local.name);
            }
          }

          if (keep.length === 0) statement.remove();
          else statement.node.specifiers = keep;
        }

        if (localizedSpecifiers.length > 0) {
          programPath.unshiftContainer("body", t.importDeclaration(localizedSpecifiers, t.stringLiteral(LOCALIZED_IMPORT)));
        }

        let needsLocaleImport = false;
        let needsContentTextImport = false;
        const localeCall = () => {
          needsLocaleImport = true;
          return t.callExpression(t.identifier(UI_LOCALE_LOCAL), []);
        };

        programPath.traverse({
          CallExpression(callPath) {
            const callee = callPath.node.callee;
            if (!t.isMemberExpression(callee) || callee.computed || !t.isIdentifier(callee.property) || !DATE_METHODS.has(callee.property.name)) return;
            if (!isFrenchLocaleLiteral(t, callPath.node.arguments[0])) return;
            callPath.node.arguments[0] = localeCall();
          },
          NewExpression(newPath) {
            const callee = newPath.node.callee;
            if (
              !t.isMemberExpression(callee) || callee.computed ||
              !t.isIdentifier(callee.object, { name: "Intl" }) ||
              !t.isIdentifier(callee.property, { name: "DateTimeFormat" }) ||
              !isFrenchLocaleLiteral(t, newPath.node.arguments[0])
            ) return;
            newPath.node.arguments[0] = localeCall();
          },
          JSXExpressionContainer(expressionPath) {
            if (!expressionPath.parentPath?.isJSXElement() && !expressionPath.parentPath?.isJSXFragment()) return;
            const expression = expressionPath.node.expression;
            if (!t.isMemberExpression(expression) || expression.computed || !t.isIdentifier(expression.property)) return;
            if (!CONTENT_FIELDS.has(expression.property.name)) return;
            if (!(t.isIdentifier(expression.object) || t.isMemberExpression(expression.object))) return;

            const object = t.cloneNode(expression.object, true);
            const original = t.cloneNode(expression, true);
            const translation = t.memberExpression(t.cloneNode(object, true), t.identifier("translation"));
            const sourceLanguage = t.memberExpression(t.cloneNode(object, true), t.identifier("sourceLanguage"));
            expressionPath.node.expression = t.callExpression(t.identifier(CONTENT_TEXT_LOCAL), [
              original,
              translation,
              t.stringLiteral(expression.property.name),
              sourceLanguage
            ]);
            needsContentTextImport = true;
          }
        });

        if (needsLocaleImport) {
          programPath.unshiftContainer(
            "body",
            t.importDeclaration(
              [t.importSpecifier(t.identifier(UI_LOCALE_LOCAL), t.identifier("getCurrentUiLocaleTag"))],
              t.stringLiteral(UI_LOCALE_IMPORT)
            )
          );
        }

        if (needsContentTextImport) {
          programPath.unshiftContainer(
            "body",
            t.importDeclaration(
              [t.importSpecifier(t.identifier(CONTENT_TEXT_LOCAL), t.identifier("translateRuntimeContentText"))],
              t.stringLiteral(CONTENT_TEXT_IMPORT)
            )
          );
        }
      }
    }
  };
};
