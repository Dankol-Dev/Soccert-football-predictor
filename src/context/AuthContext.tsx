import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/services/supabase';
import type { LoginPayload, RegisterPayload, User } from '@/types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapSupabaseUser(
  id: string,
  email: string,
  name: string | undefined,
  createdAt: string | undefined
): User {
  return {
    id,
    email,
    name: name ?? email.split('@')[0],
    role: 'user',
    createdAt: createdAt ?? new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user) {
          const meta = session.user.user_metadata;
          setUser(
            mapSupabaseUser(
              session.user.id,
              session.user.email ?? '',
              meta?.name,
              session.user.created_at
            )
          );
        }
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) {
          const meta = session.user.user_metadata;
          setUser(
            mapSupabaseUser(
              session.user.id,
              session.user.email ?? '',
              meta?.name,
              session.user.created_at
            )
          );
        } else {
          setUser(null);
        }
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: payload.email,
      password: payload.password,
    });
    if (error) throw error;

    if (data.user) {
      const meta = data.user.user_metadata;
      setUser(
        mapSupabaseUser(
          data.user.id,
          data.user.email ?? '',
          meta?.name,
          data.user.created_at
        )
      );
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: { name: payload.name },
      },
    });
    if (error) throw error;

    if (data.session?.user) {
      const meta = data.session.user.user_metadata;
      setUser(
        mapSupabaseUser(
          data.session.user.id,
          data.session.user.email ?? payload.email,
          meta?.name ?? payload.name,
          data.session.user.created_at
        )
      );
      return true;
    }
    setUser(null);
    return false;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: !!user, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
