import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useTranslation } from '../hooks/useTranslation.ts';
import * as authService from '../../services/authService.ts';
import * as backendService from '../../services/backendService.ts';
import {
  clearAccessToken,
  setAccessToken,
  setUnauthorizedHandler,
} from '../../services/authTokenStore.ts';
import { clearAppCaches } from '../../services/storageService.ts';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  token: string | null;
  loading: boolean;
  initializing: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  userChanged: boolean;
  resetUserChanged: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const useApplySession = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const applySession = useCallback((nextSession: Session | null) => {
    setSession(nextSession);
    const nextUser = nextSession?.user ?? null;
    setUser(nextUser);
    const nextToken = nextSession?.access_token ?? null;
    setToken(nextToken);

    if (nextToken) {
      setAccessToken(nextToken);
    } else {
      clearAccessToken();
    }
  }, []);

  return { session, user, token, applySession };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const { session, user, token, applySession } = useApplySession();
  const [initializing, setInitializing] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userChanged, setUserChanged] = useState<boolean>(false);

  const ensureUserDataInitialized = useCallback(async () => {
    try {
      const data = await backendService.fetchInitialData();
      if (!data.categories || data.categories.length === 0) {
        await backendService.loadInitialData();
      }
    } catch (initError) {
      console.error(t('auth.errors.ensureUserData'), initError);
    }
  }, [t]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      applySession(null);
      clearAppCaches();
      setError(t('auth.errors.sessionExpired'));
      authService.signOut().catch((signOutError) => {
        console.error(t('auth.errors.supabaseSignOut'), signOutError);
      });
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [applySession, t]);

  useEffect(() => {
    let isMounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const bootstrap = async () => {
      try {
        const existingSession = await authService.getSession();
        if (!isMounted) {
          return;
        }
        applySession(existingSession);
      } catch (bootstrapError) {
        console.error(t('auth.errors.restoreSession'), bootstrapError);
        if (isMounted) {
          setError((bootstrapError as Error).message);
        }
      } finally {
        if (isMounted) {
          setInitializing(false);
        }
      }
    };

    bootstrap();

    try {
      subscription = authService.onAuthStateChange((event, nextSession) => {
        if (!isMounted) {
          return;
        }
        applySession(nextSession);
        if (event === 'SIGNED_OUT') {
          clearAppCaches();
          setError(null);
        }
      });
    } catch (subscriptionError) {
      console.error(t('auth.errors.subscribeAuth'), subscriptionError);
      if (isMounted) {
        setError((subscriptionError as Error).message);
        setInitializing(false);
      }
    }

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [applySession, t]);

  const withLoading = async <T,>(fn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    try {
      return await fn();
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      await withLoading(async () => {
        const previousUserId = session?.user?.id;
        const { session: nextSession } = await authService.signIn(email, password);
        if (!nextSession) {
          throw new Error(t('auth.errors.noSessionAfterSignIn'));
        }
        if (!previousUserId || nextSession.user?.id !== previousUserId) {
          clearAppCaches();
          setUserChanged(true);
        }
        applySession(nextSession);
        await ensureUserDataInitialized();
      });
    } catch (signInError) {
      setError((signInError as Error).message);
      throw signInError;
    }
  };

  const signUp = async (email: string, password: string) => {
    setError(null);
    try {
      await withLoading(async () => {
        const { session: nextSession } = await authService.signUp(email, password);

        if (!nextSession) {
          throw new Error(t('auth.errors.noSessionAfterSignUp'));
        }

        clearAppCaches();
        applySession(nextSession);
        await ensureUserDataInitialized();
      });
    } catch (signUpError) {
      setError((signUpError as Error).message);
      throw signUpError;
    }
  };

  const signOut = async () => {
    setError(null);
    try {
      await withLoading(async () => {
        await authService.signOut();
        clearAppCaches();
        applySession(null);
      });
    } catch (signOutError) {
      setError((signOutError as Error).message);
      throw signOutError;
    }
  };

  const refreshSession = async () => {
    setError(null);
    try {
      await withLoading(async () => {
        const nextSession = await authService.refreshSession();
        applySession(nextSession ?? null);
      });
    } catch (refreshError) {
      setError((refreshError as Error).message);
      throw refreshError;
    }
  };

  const resetUserChanged = useCallback(() => {
    setUserChanged(false);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    token,
    loading,
    initializing,
    error,
    signIn,
    signUp,
    signOut,
    refreshSession,
    userChanged,
    resetUserChanged,
  }), [user, session, token, loading, initializing, error, userChanged, resetUserChanged]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
