import { publicEnvSchema } from "./schema";

/**
 * Browser bundle: Next.js only inlines `NEXT_PUBLIC_*` when each name is read
 * directly from `process.env`. Passing `process.env` into Zod leaves those
 * keys undefined in the client chunk — use an explicit pick object instead.
 */
const raw = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

const parsed = publicEnvSchema.safeParse(raw);
if (!parsed.success) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Set them in the host (e.g. Vercel → Project → Settings → Environment Variables) for Production and Preview, then redeploy.",
  );
}

export const publicEnv = parsed.data;
