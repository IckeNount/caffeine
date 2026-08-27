# Apply RAG schema changes in Supabase SQL Editor

Use the Supabase dashboard to apply repository SQL manually:

1. Open the project in Supabase Dashboard.
2. Open SQL Editor and create a query.
3. For a brand-new, empty project only, run `scripts/setup-db.sql` to create the current knowledge-base, analysis-cache, provenance, and retrieval objects.
4. For an existing deployment, inspect the schema before applying SQL. `scripts/setup-db.sql` is a clean-reset script and must not be run against data that should be retained.
5. Run `scripts/migrate-to-openai-embeddings.sql` only when intentionally migrating an older embedding schema.

Do not run the historical admin, transcription, or combined lesson/RAG evolution scripts for the demo core. `scripts/migrate-rag-schema-evolution.sql` includes obsolete lesson objects despite its name. These scripts remain only as migration history and for auditing existing deployments.

The required retained objects are `analyses`, `kb_documents`, `kb_chunks`, `match_kb_chunks`, and `match_analyses`.
