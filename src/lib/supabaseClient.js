import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables (supports both Vite and Next.js conventions)
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if credentials are properly configured
export const isSupabaseConfigured = () => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project-id.supabase.co' &&
    supabaseAnonKey !== 'your-anon-key-here' &&
    !supabaseUrl.includes('placeholder')
  );
};

// Create and export the Supabase client
// If credentials are missing or default placeholders, provide a fallback client
// to prevent uncaught runtime errors while informing the developer.
let client;

if (isSupabaseConfigured()) {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
  });
} else {
  // Graceful dummy client so the UI renders and displays the setup banner
  // instead of crashing on undefined URL.
  console.warn(
    '⚠️ Supabase is not configured yet! Please add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file.'
  );
  client = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-anon-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  );
}

export const supabase = client;
