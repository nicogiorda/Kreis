import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const supabaseKey = supabasePublishableKey ?? supabaseAnonKey;

function requireSupabaseBrowserEnv(): { url: string; key: string } {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase browser env vars: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY.");
  }

  return {
    url: supabaseUrl,
    key: supabaseKey
  };
}

const supabaseEnv = requireSupabaseBrowserEnv();

export const supabaseBrowser = createClient(supabaseEnv.url, supabaseEnv.key, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    persistSession: true,
    storageKey: "kreis-supabase-auth-v1"
  }
});
