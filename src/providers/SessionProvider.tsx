import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo
} from "react";

import { currentUser } from "@/data/mockData";
import type { AppUser } from "@/types/messaging";

interface SessionContextValue {
  currentUser: AppUser;
  accessToken: string | null;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const value = useMemo<SessionContextValue>(
    () => ({
      currentUser,
      accessToken: null
    }),
    []
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
