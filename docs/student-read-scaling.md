# Student read scaling (published lessons)

Students load **published** content from Postgres (and Supabase Storage for media). No third-party LLM calls on this path.

## Current behavior

- `GET /api/lessons/[id]` uses `Cache-Control: public, s-maxage=120, stale-while-revalidate=600`.
- When `lessons.published_payload` is present, the API returns segments (and notes) from the **snapshot** so the live student view matches the last publish.

## Narrow selects

The route selects only fields needed for the lesson viewer. Avoid adding large draft-only columns to this handler.

## Next steps under load

1. **Supavisor / pooler** for serverless bursts to Postgres.
2. **Static JSON in Storage**: on publish, write `lessons/{id}/v{n}.json` and serve via CDN; keep DB as source of truth for metadata.
3. **Read replicas** if Supabase plan supports them for read-heavy workloads.

## RLS

Students rely on `lessons.status = 'published'` and segment policies that mirror the parent lesson; do not expose teacher drafts on anonymous keys.
