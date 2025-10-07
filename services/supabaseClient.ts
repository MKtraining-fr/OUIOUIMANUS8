import { createClient } from '@supabase/supabase-js';
import { createClient as createFallbackClient } from '../stubs/supabase-js';

const normalizeSupabaseUrl = (rawUrl: string): string => {
  try {
    const parsed = new URL(rawUrl);
    const sanitizedPath = parsed.pathname.replace(/\/+$/, '');

    if (sanitizedPath && sanitizedPath !== '/') {
      const invalidSegment = sanitizedPath === '' ? '/' : sanitizedPath;
      throw new Error(
        `VITE_SUPABASE_URL must point to the project root (e.g. https://xxxx.supabase.co). Remove the path "${invalidSegment}" to avoid cross-origin errors.`,
      );
    }

    return parsed.origin;
  } catch (error) {
    const details = error instanceof Error ? ` ${error.message}` : '';
    throw new Error(`Invalid VITE_SUPABASE_URL provided.${details}`.trim());
  }
};

type SupabaseClient = ReturnType<typeof createClient>;

const createDisabledClient = (): SupabaseClient => {
  return createFallbackClient() as SupabaseClient;
};

let supabaseClient: SupabaseClient;
let supabaseConfigured = true;

try {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!url || !anonKey) {
    const missingVars = [
      !url ? 'VITE_SUPABASE_URL' : null,
      !anonKey ? 'VITE_SUPABASE_ANON_KEY' : null,
    ].filter(Boolean);

    throw new Error(`Missing Supabase environment variables: ${missingVars.join(', ')}`);
  }

  const normalizedUrl = normalizeSupabaseUrl(url);

  supabaseClient = createClient(normalizedUrl, anonKey, {
    auth: {
      persistSession: false,
    },
  });
} catch (error) {
  supabaseConfigured = false;

  const reason =
    error instanceof Error
      ? error.message
      : 'Unknown error while creating the Supabase client.';

  console.warn(
    'Supabase client disabled. Falling back to the offline stub. Operations depending on Supabase will fail until the environment is configured.',
    reason,
  );

  supabaseClient = createDisabledClient();
}

export const supabase = supabaseClient;
export const isSupabaseReady = supabaseConfigured;
