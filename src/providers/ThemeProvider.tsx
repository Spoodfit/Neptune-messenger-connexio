import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState } from "react";
import { useColorScheme
} from "react-native";

import { createStandaloneStateStore } from "../storage/standaloneStore";
import { darkSemanticPalette, lightSemanticPalette } from "../theme/semanticPalette";

export type ConnexioAppearanceMode = "system" | "dark" | "light";

export interface ConnexioTheme {
  mode: ConnexioAppearanceMode;
  isLight: boolean;
  pageBackground: string;
  pageRaised: string;
  pageGradient: readonly [string, string];
  pageText: string;
  pageTextSecondary: string;
  pageTextMuted: string;
  surface: string;
  surfaceStrong: string;
  surfaceMuted: string;
  border: string;
  borderSoft: string;
  inputBackground: string;
  chipBackground: string;
  shellBackground: string;
  shellBorder: string;
  navBackground: string;
  navBorder: string;
  navInactive: string;
  overlay: string;
  accent: string;
  accentSoft: string;
  violet: string;
  violetSoft: string;
  orange: string;
  orangeSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  shadow: string;
  setMode: (mode: ConnexioAppearanceMode) => void;
}

const ThemeContext = createContext<ConnexioTheme | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const store = useMemo(() => createStandaloneStateStore(), []);
  const [mode, setModeState] = useState<ConnexioAppearanceMode>("system");

  useEffect(() => {
    let cancelled = false;
    void store.load<ConnexioAppearanceMode>("appearance").then((saved) => {
      if (!cancelled && (saved === "system" || saved === "dark" || saved === "light")) setModeState(saved);
    });
    return () => { cancelled = true; };
  }, [store]);

  const setMode = (next: ConnexioAppearanceMode) => {
    setModeState(next);
    void store.save("appearance", next);
  };

  const isLight = mode === "light" || (mode === "system" && systemScheme === "light");
  const palette = isLight ? lightSemanticPalette : darkSemanticPalette;
  const value = useMemo<ConnexioTheme>(() => ({
    mode,
    isLight,
    pageBackground: palette.background,
    pageRaised: palette.raised,
    pageGradient: palette.gradient,
    pageText: palette.text,
    pageTextSecondary: palette.textSecondary,
    pageTextMuted: palette.textMuted,
    surface: palette.surface,
    surfaceStrong: palette.surfaceStrong,
    surfaceMuted: palette.surfaceMuted,
    border: palette.border,
    borderSoft: palette.borderSoft,
    inputBackground: palette.input,
    chipBackground: palette.chip,
    shellBackground: palette.shell,
    shellBorder: palette.border,
    navBackground: palette.nav,
    navBorder: palette.border,
    navInactive: palette.navInactive,
    overlay: palette.overlay,
    accent: palette.accent,
    accentSoft: palette.accentSoft,
    violet: palette.violet,
    violetSoft: palette.violetSoft,
    orange: palette.orange,
    orangeSoft: palette.orangeSoft,
    success: palette.success,
    successSoft: palette.successSoft,
    warning: palette.warning,
    warningSoft: palette.warningSoft,
    danger: palette.danger,
    dangerSoft: palette.dangerSoft,
    shadow: palette.shadow,
    setMode
  }), [isLight, mode, palette]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ConnexioTheme {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useAppTheme doit être utilisé dans ThemeProvider.");
  return context;
}
