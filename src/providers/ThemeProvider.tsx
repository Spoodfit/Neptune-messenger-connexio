import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, useColorScheme } from "react-native";

import { createStandaloneStateStore } from "../storage/standaloneStore";

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
  shellBackground: string;
  shellBorder: string;
  navBackground: string;
  navBorder: string;
  navInactive: string;
  overlay: string;
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

  useEffect(() => {
    Appearance.setColorScheme(mode === "system" ? null : mode);
  }, [mode]);

  const setMode = (next: ConnexioAppearanceMode) => {
    setModeState(next);
    void store.save("appearance", next);
  };

  const isLight = mode === "light" || (mode === "system" && systemScheme === "light");
  const value = useMemo<ConnexioTheme>(() => ({
    mode,
    isLight,
    pageBackground: isLight ? "#F2F5FA" : "#020713",
    pageRaised: isLight ? "#FFFFFF" : "#050B1C",
    pageGradient: isLight ? ["#FFFFFF", "#EDF2F8"] : ["#050B1C", "#020713"],
    pageText: isLight ? "#08152D" : "#F4F7FF",
    pageTextSecondary: isLight ? "#33415C" : "#D2DBEF",
    pageTextMuted: isLight ? "#66738C" : "#AEB8D2",
    shellBackground: isLight ? "rgba(255,255,255,0.96)" : "rgba(8,18,38,0.98)",
    shellBorder: isLight ? "rgba(8,21,45,0.12)" : "rgba(255,255,255,0.14)",
    navBackground: isLight ? "rgba(255,255,255,0.98)" : "rgba(8,18,38,0.98)",
    navBorder: isLight ? "rgba(8,21,45,0.14)" : "rgba(255,255,255,0.14)",
    navInactive: isLight ? "#65728B" : "#7F8DAB",
    overlay: isLight ? "rgba(13,25,48,0.40)" : "rgba(0,0,0,0.68)",
    setMode
  }), [isLight, mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ConnexioTheme {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useAppTheme doit être utilisé dans ThemeProvider.");
  return context;
}
