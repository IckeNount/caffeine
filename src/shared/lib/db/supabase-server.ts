import { env } from "@/env/server";
import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side Supabase client using @supabase/ssr
// Reads/writes auth cookies so the session is shared with the browser
// Used in API routes, Server Components, and Server Actions
export async function createServerClient() {
  const cookieStore = await cookies();

  return createSSRServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll was called from a Server Component.
            // This can be ignored — middleware handles refreshing cookies.
          }
        },
      },
    },
  );
}
