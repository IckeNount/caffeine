# Scalability Report: Caffaine Codebase

**Date:** March 2026
**Target System:** LinguBreak MVP Architecture (Next.js, Supabase, LLMs)

---

## Current Scalability Estimate (50–100 Concurrent Students)

The current system relies heavily on a solid caching layer within Supabase (`analyses` table). When a sentence analysis is retrieved from the cache, the architecture bypasses expensive LLM generation entirely, providing instant responses.
However, under conditions where students query **unique, never-before-seen sentences** at the same time, the system will face severe bottlenecks.

### Primary Bottlenecks (Low Scale Constraints)

1. **Synchronous LLM Processing:** The `/api/analyze` route is purely synchronous. An LLM request taking 5–15 seconds forces the API connection to remain open, placing high memory strain on the Node.js server and risking timeout limits (e.g., Vercel's standard 10s-15s timeout limits).
2. **Provider Rate Limits:** Unique requests use OpenRouter's free model router. Free-tier availability and request limits can still produce `HTTP 429 Too Many Requests` responses during spikes.
3. **Critical Collision Bug:** The `hashSentence` function in `ai-providers.ts` uses a weak bitwise implementation (`((hash << 5) - hash) + char`). At scale (thousands of distinct sentences), two different sentences will inevitably hash to the identical string. This will result in a terrifying cache-hit failure where Student B receives an analysis for Student A's completely different sentence.

---

## Improvement Roadmap (Scaling to 1,000+ Students)

To comfortably support school-wide usage without crashing, the following four architecture updates are recommended:

### 1. Fix Hash Collisions immediately (High Risk)

Replace the custom `djb2`-style loop with a fast, cryptographically secure hash mechanism (e.g., **SHA-256**) to guarantee universally unique database keys.

```typescript
import { createHash } from "crypto";
function hashSentence(sentence: string): string {
  return createHash("sha256").update(sentence).digest("hex");
}
```

### 2. Edge Runtime & Streaming JSON

Currently, the frontend blocks until the _entire_ 4,000-token JSON is parsed and returned. By adopting the **Edge runtime** and streaming the JSON back using tools like the Vercel AI SDK, students will see content rendering instantly—even if the underlying request takes 10+ seconds to finish. This drastically improves perceived performance.

### 3. Connection Pooling for Postgres

The current implementation invokes `createClient` using `supabaseAdmin`. At high concurrency, raw database calls can exhaust the max direct connections limit on Supabase PostgREST proxying. Ensure `NEXT_PUBLIC_SUPABASE_URL` points specifically to a **Supavisor connection pooling port** (usually `6543`) to queue database connections fairly instead of failing outright.

### 4. Asynchronous Queuing (For 10,000+ Scale)

If extreme spikes occur, blocking HTTP requests will always fail eventually. Introduce an async queue (like **Upstash QStash** or **BullMQ**).

- The Next.js API instantly returns a `jobId`.
- A background worker safely processes the LLM generation without timeouts.
- The frontend client polls `/api/status?jobId=` or uses WebSockets to retrieve the result once completed.

---

**Conclusion:** The codebase is well-structured for a pilot test group. However, fixing the caching hash function is mandatory before allowing more than 50 unique users, and moving to streamed/queued LLM execution is the key for mass concurrency.
