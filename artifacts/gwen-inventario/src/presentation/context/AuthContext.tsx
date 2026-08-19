import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import {
  SupabaseAuthService,
  type AuthSession,
  type SignUpInput,
} from '@/src/services/auth/authService';

type AuthContextValue = {
  session: AuthSession | null;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (input: SignUpInput) => Promise<'signed-in' | 'confirm-email'>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const authService = new SupabaseAuthService();

function readableError(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authService
      .getSession()
      .then(setSession)
      .catch((error: unknown) => setError(readableError(error)))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      error,
      clearError: () => setError(null),
      signIn: async (email, password) => {
        setError(null);
        try {
          setSession(await authService.signIn(email, password));
          return true;
        } catch (error: unknown) {
          setError(readableError(error));
          return false;
        }
      },
      signUp: async (input) => {
        setError(null);
        try {
          const result = await authService.signUp(input);
          if (result.session) setSession(result.session);
          return result.needsEmailConfirmation ? 'confirm-email' : 'signed-in';
        } catch (error: unknown) {
          setError(readableError(error));
          return 'confirm-email';
        }
      },
      signOut: async () => {
        setError(null);
        await authService.clearSession();
        setSession(null);
      },
    }),
    [error, loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return context;
}