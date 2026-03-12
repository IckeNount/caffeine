import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client using @supabase/ssr
// Stores auth tokens in cookies (synced with server-side)
// createBrowserClient is already a singleton — safe to call multiple times

export function getSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
