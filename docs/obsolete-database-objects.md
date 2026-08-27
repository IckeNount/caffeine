# Suspected Obsolete Database Objects

The demo-core refactor intentionally performs no destructive database migration. Existing deployments may still contain these objects from the removed teacher, lesson, translation, and transcription product surfaces:

- `profiles` and teacher role/API-key columns
- `folders`
- `lessons`
- `lesson_segments`
- `lesson_segment_analyses`
- `lesson_units`
- lesson publication snapshot/version columns or tables
- `translation_jobs`
- `transcriptions`
- the `transcription-audio` storage bucket

Before a later cleanup, compare this list against the deployed schema and confirm that no external client or retained RAG query references an object. Keep `analyses`, `kb_documents`, `kb_chunks`, and the `match_kb_chunks` / `match_analyses` retrieval functions.
