import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { AppState, Platform } from "react-native";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { env } from "../config/env";
import { shouldClearSessionAfterRefreshFailure } from "../domain/sessionErrors";
import {
  calculateAccessTokenExpiry,
  shouldRefreshAccessToken
} from "../domain/sessionTokens";
import { currentUser as demoUser } from "../data/mockData";
import { ApiError } from "../services/api/httpClient";
import { NeptuneMessagingApi } from "../services/api/neptuneApi";
import { NeptuneSessionApi } from "../services/api/sessionApi";
import { configureSessionRuntime } from "../services/auth/sessionRuntime";
import {
  getRegisteredPushToken,
  unregisterDeviceFromPushNotifications
} from "../services/notifications/pushNotifications";
import type { AppUser, SessionPayload } from "../types/messaging";

const REFRESH_TOKEN_KEY = "connexio.session.refresh-token";
const USER_KEY = "connexio.session.user";
const DEVICE_ID_KEY = "connexio.device.id";

interface SessionContextValue {
  currentUser: AppUser;
  accessToken: string | null;
  isAuthenticated: boolean;
  sessionReady: boolean;
  getAccessToken: () => Promise<string | null>;
  refreshAccessToken: () => Promise<string | null>;
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

  const accessTokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);
  const accessTokenExpiresAtRef = useRef<number | null>(null);
  const refreshInFlightRef = useRef<Promise<string | null> | null>(null);

  const persistSession = useCallback(async (session: SessionPayload) => {
    const expiresAt = calculateAccessTokenExpiry(session.expiresIn);
    accessTokenRef.current = session.accessToken;
    refreshTokenRef.current = session.refreshToken;
    accessTokenExpiresAtRef.current = expiresAt;
    setAccessToken(session.accessToken);
    setRefreshToken(session.refreshToken);
    setCurrentUser(session.user);
    await Promise.all([
      secureSet(REFRESH_TOKEN_KEY, session.refreshToken),
      secureSet(USER_KEY, JSON.stringify(session.user))
    ]);
  }, []);

  const clearSession = useCallback(async () => {
    accessTokenRef.current = null;
    refreshTokenRef.current = null;
    accessTokenExpiresAtRef.current = null;
    setAccessToken(null);
    setRefreshToken(null);
    setCurrentUser(demoUser);
    await Promise.all([
      secureDelete(REFRESH_TOKEN_KEY),
      secureDelete(USER_KEY)
    ]);
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (env.mockMode) return accessTokenRef.current;
    if (refreshInFlightRef.current) return refreshInFlightRef.current;

    const operation = (async () => {
      const storedRefreshToken =
        refreshTokenRef.current ?? (await secureGet(REFRESH_TOKEN_KEY));
      if (!storedRefreshToken) return null;

      try {
        const session = await sessionApi.refreshSession(storedRefreshToken);
        await persistSession(session);
        return session.accessToken;
      } catch (error) {
        if (
          error instanceof ApiError &&
          shouldClearSessionAfterRefreshFailure(error.status)
        ) {
          await clearSession();
          return null;
        }
        // Une panne réseau ou serveur ne doit jamais déconnecter l'utilisateur.
        return accessTokenRef.current;
      }
    })().finally(() => {
      refreshInFlightRef.current = null;
    });

    refreshInFlightRef.current = operation;
    return operation;
  }, [clearSession, persistSession]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (env.mockMode) return accessTokenRef.current;
    if (
      !shouldRefreshAccessToken(
        accessTokenRef.current,
        accessTokenExpiresAtRef.current
      )
    ) {
      return accessTokenRef.current;
    }
    return refreshAccessToken();
  }, [refreshAccessToken]);

  useLayoutEffect(
    () => configureSessionRuntime({ getAccessToken, refreshAccessToken }),
    [getAccessToken, refreshAccessToken]
  );

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
        refreshTokenRef.current = storedRefreshToken;
        setRefreshToken(storedRefreshToken);
        const session = await sessionApi.refreshSession(storedRefreshToken);
        if (!cancelled) await persistSession(session);
      } catch (error) {
        if (
          !cancelled &&
          error instanceof ApiError &&
          shouldClearSessionAfterRefreshFailure(error.status)
        ) {
          await clearSession();
        }
      } finally {
        if (!cancelled) setSessionReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clearSession, persistSession]);

  useEffect(() => {
    if (env.mockMode || accessToken || !refreshToken) return;
    const retryTimer = setTimeout(() => void refreshAccessToken(), 5_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshAccessToken();
    });
    return () => {
      clearTimeout(retryTimer);
      subscription.remove();
    };
  }, [accessToken, refreshAccessToken, refreshToken]);

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
    const accessTokenToRevoke = accessTokenRef.current;
    const refreshTokenToRevoke = refreshTokenRef.current ?? refreshToken;
    const registeredPushToken = await getRegisteredPushToken();

    await clearSession();

    const revocations: Promise<unknown>[] = [
      unregisterDeviceFromPushNotifications()
    ];
    if (registeredPushToken && accessTokenToRevoke) {
      revocations.push(
        new NeptuneMessagingApi(accessTokenToRevoke).unregisterPushToken(
          registeredPushToken
        )
      );
    }
    if (refreshTokenToRevoke) {
      revocations.push(sessionApi.revokeSession(refreshTokenToRevoke));
    }
    await Promise.allSettled(revocations);
  }, [clearSession, refreshToken]);

  const value = useMemo<SessionContextValue>(
    () => ({
      currentUser,
      accessToken,
      isAuthenticated: env.mockMode || Boolean(accessToken || refreshToken),
      sessionReady,
      getAccessToken,
      refreshAccessToken,
      exchangeOneTimeCode,
      signOut
    }),
    [
      accessToken,
      currentUser,
      exchangeOneTimeCode,
      getAccessToken,
      refreshAccessToken,
      refreshToken,
      sessionReady,
      signOut
    ]
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
