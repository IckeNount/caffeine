# Embedding model spike (optional)

When RAG retrieval quality is insufficient after **prompt compression** and **deduped embeddings**, benchmark retrieval before changing vector dimensions.

## Candidates

| Model | Dimensions | Notes |
|-------|------------|--------|
| `text-embedding-3-small` | 1536 (current) | Default; best cost; good baseline |
| `text-embedding-3-large` | 3072 | Higher quality on hard semantic match; requires **full re-embed** + **pgvector migration** |

## Procedure

1. Build a **gold set** of 30–50 English sentences and manually tag which KB chunk IDs (or headings) should rank in the top 5.
2. For each model, embed the KB and queries; run `match_kb_chunks` equivalent offline.
3. Metrics: **Recall@5**, **MRR**, and **latency** (ingest + query).
4. Only switch if Recall@5 improves by a clear margin (e.g. +10% absolute) — migration cost is high.

## Migration reminder

Changing dimensions requires the same class of steps as `scripts/migrate-to-openai-embeddings.sql`: drop HNSW indexes, alter `vector` columns, re-ingest `kb_chunks`, refresh `analyses.embedding` for semantic cache.
