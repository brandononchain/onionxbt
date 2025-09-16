import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type AuthContextValue = {
  idToken: string | null;
  setIdToken: (token: string | null) => void;
  isAuthenticated: boolean;
  clear: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [idToken, setIdToken] = useState<string | null>(null);

  const clear = useCallback(() => setIdToken(null), []);

  const value = useMemo<AuthContextValue>(() => ({
    idToken,
    setIdToken,
    isAuthenticated: Boolean(idToken),
    clear,
  }), [idToken, clear]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

