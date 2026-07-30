import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import { env } from "../config/env";
import { currentUser as demoUser } from "../data/mockData";
import { NeptuneSessionApi } from "../services/api/sessionApi";
import type { AppUser, SessionPayload } from "../types/messaging";

const REFRESH_TOKEN_KEY = "connexio.session.refresh-token";
const USER_KEY = "connexio.session.user";
const DEVICE_ID_KEY = "connexio.device.id";

interface SessionContextValue {
  currentUser: AppUser;
  accessToken: string | null;
  isAuthenticated: boolean;
  sessionReady: boolean;
  exchangeOneTimeCode: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);
const sessionApi = new NeptuneSessionApi();

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") return null;
  return SecureStore.getItemAsync(key);
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") return;
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === "web") return;
  await SecureStore.deleteItemAsync(key);
}

async function getDeviceId(): Promise<string> {
  const existing = await secureGet(DEVICE_ID_KEY);
  if (existing) return existing;
  const generated = Crypto.randomUUID();
  await secureSet(DEVICE_ID_KEY, generated);
  return generated;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [currentUser, setCurrentUser] = useState<AppUser>(demoUser);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(env.mockMode);

  const persistSession = useCallback(async (session: SessionPayload) => {
    setAccessToken(session.accessToken);
    setRefreshToken(session.refreshToken);
    setCurrentUser(session.user);
    await Promise.all([
      secureSet(REFRESH_TOKEN_KEY, session.refreshToken),
      secureSet(USER_KEY, JSON.stringify(session.user))
    ]);
  }, []);

  const clearSession = useCallback(async () => {
    setAccessToken(null);
    setRefreshToken(null);
    setCurrentUser(demoUser);
    await Promise.all([
      secureDelete(REFRESH_TOKEN_KEY),
      secureDelete(USER_KEY)
    ]);
  }, []);

  useEffect(() => {
    if (env.mockMode) return;
    let cancelled = false;
    void (async () => {
      try {
        const [storedRefreshToken, storedUser] = await Promise.all([
          secureGet(REFRESH_TOKEN_KEY),
          secureGet(USER_KEY)
        ]);
        if (storedUser) {
          try {
            setCurrentUser(JSON.parse(storedUser) as AppUser);
          } catch {
            await secureDelete(USER_KEY);
          }
        }
        if (!storedRefreshToken) return;
        const session = await sessionApi.refreshSession(storedRefreshToken);
        if (!cancelled) await persistSession(session);
      } catch {
        if (!cancelled) await clearSession();
      } finally {
        if (!cancelled) setSessionReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clearSession, persistSession]);

  const exchangeOneTimeCode = useCallback(
    async (code: string) => {
      const cleanCode = code.trim();
      if (!cleanCode) throw new Error("Code de connexion manquant.");
      const session = await sessionApi.exchangeOneTimeCode(
        cleanCode,
        await getDeviceId()
      );
      await persistSession(session);
      setSessionReady(true);
    },
    [persistSession]
  );

  const signOut = useCallback(async () => {
    const tokenToRevoke = refreshToken;
    await clearSession();
    if (tokenToRevoke) {
      try {
        await sessionApi.revokeSession(tokenToRevoke);
      } catch {
        // La session locale est supprimée même si le backend est indisponible.
      }
    }
  }, [clearSession, refreshToken]);

  const value = useMemo<SessionContextValue>(
    () => ({
      currentUser,
      accessToken,
      isAuthenticated: env.mockMode || Boolean(accessToken),
      sessionReady,
      exchangeOneTimeCode,
      signOut
    }),
    [accessToken, currentUser, exchangeOneTimeCode, sessionReady, signOut]
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession doit être utilisé dans SessionProvider.");
  }
  return context;
}
