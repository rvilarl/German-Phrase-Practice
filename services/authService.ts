import { createClient, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseUrl } from './env.ts';

let client: SupabaseClient | null = null;

const ensureClient = (): SupabaseClient => {
  if (client) {
    return client;
  }

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    throw new Error('Supabase credentials are not configured.');
  }

  client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return client;
};

export const getClient = (): SupabaseClient => ensureClient();

export const signUp = async (email: string, password: string) => {
  const { data, error } = await ensureClient().auth.signUp({ email, password });
  if (error) {
    throw error;
  }
  return data;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await ensureClient().auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
  return data;
};

export const signOut = async () => {
  const { error } = await ensureClient().auth.signOut();
  if (error) {
    throw error;
  }
};

export const getSession = async (): Promise<Session | null> => {
  const { data, error } = await ensureClient().auth.getSession();
  if (error) {
    throw error;
  }
  return data.session ?? null;
};

export const refreshSession = async (): Promise<Session | null> => {
  const { data, error } = await ensureClient().auth.refreshSession();
  if (error) {
    throw error;
  }
  return data.session ?? null;
};

export const getCurrentUser = async (): Promise<User | null> => {
  const { data, error } = await ensureClient().auth.getUser();
  if (error) {
    throw error;
  }
  return data.user ?? null;
};

export const onAuthStateChange = (callback: (event: string, session: Session | null) => void) => {
  const { data } = ensureClient().auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return data.subscription;
};
