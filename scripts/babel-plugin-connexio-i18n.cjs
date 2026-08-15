const path = require("node:path");

const LOCALIZED_IMPORT = "@/components/LocalizedNative";
const TARGETS = new Set(["Text", "TextInput", "Pressable", "Button"]);
const EXCLUDED_FILES = new Set([
  "src/components/LocalizedNative.tsx",
  "src/components/LocalizedText.tsx",
  "src/components/LocalizedTextInput.tsx"
]);

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
              localizedSpecifiers.push(
                t.importSpecifier(t.identifier(specifier.local.name), t.identifier(imported))
              );
              existingLocalizedLocals.add(specifier.local.name);
            }
          }

          if (keep.length === 0) statement.remove();
          else statement.node.specifiers = keep;
        }

        if (localizedSpecifiers.length > 0) {
          programPath.unshiftContainer(
            "body",
            t.importDeclaration(localizedSpecifiers, t.stringLiteral(LOCALIZED_IMPORT))
          );
        }
      }
    }
  };
};
