import { createClient } from "@supabase/supabase-js";
import { env } from "@/env/server";

// Server-side client with service role key (full access for RAG operations)
export const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
);
