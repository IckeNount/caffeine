# Apply schema changes in Supabase SQL Editor

We **cannot** push SQL to your Supabase project from this repo automatically. Use the dashboard:

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project  
2. **SQL Editor** → **New query**  
3. Open this file in your editor and copy its full contents:  
   [`scripts/migrate-rag-schema-evolution.sql`](../scripts/migrate-rag-schema-evolution.sql)  
4. Paste → **Run** (or `Cmd/Ctrl + Enter`)

You should see a result row: `migrate-rag-schema-evolution: done`.

## Prerequisites

| You already have… | Action |
|-------------------|--------|
| `analyses` (RAG cache) + `lessons` / `lesson_segments` | Run **only** `migrate-rag-schema-evolution.sql`. |
| No `analyses` table yet | Run `scripts/setup-db.sql` first (or your KB/RAG setup), then admin tables, then this migration. |
| Brand-new project | Run in order: `setup-db.sql` → `create-admin-tables.sql` → `migrate-rag-schema-evolution.sql` (last step is optional if `create-admin-tables.sql` in your branch already includes the same objects — check for duplicates). |

## If something fails

- **`relation "analyses" does not exist`** — create RAG tables first (`setup-db.sql`).  
- **`relation "lessons" does not exist`** — run `create-admin-tables.sql` first.  
- **`EXECUTE FUNCTION` error** — your Postgres is older; try changing `EXECUTE FUNCTION` to `EXECUTE PROCEDURE` on the `lesson_units` trigger line.

## Other migrations (only if needed)

- Switching embedding dimensions / provider: [`scripts/migrate-to-openai-embeddings.sql`](../scripts/migrate-to-openai-embeddings.sql)  
- Transcriptions feature: [`scripts/create-transcriptions-table.sql`](../scripts/create-transcriptions-table.sql)
