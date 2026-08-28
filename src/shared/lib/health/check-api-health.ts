const OPENROUTER_KEY_URL = "https://openrouter.ai/api/v1/key";
const PROBE_TIMEOUT_MS = 60_000;

const REQUIRED_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENROUTER_API_KEY",
] as const;

type HealthCheckStatus = "pass" | "fail" | "skipped";
type HealthDetails = Record<string, string | number | boolean | null>;

export interface ApiHealthCheck {
  name: string;
  status: HealthCheckStatus;
  latencyMs: number;
  details?: HealthDetails;
  error?: {
    code: string;
    message: string;
  };
}

export interface ApiHealthReport {
  status: "healthy" | "unhealthy";
  checkedAt: string;
  durationMs: number;
  checks: ApiHealthCheck[];
}

class ProbeError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

function redact(message: string): string {
  let sanitized = message;
  for (const key of [
    ...REQUIRED_ENV_KEYS,
    "OPENAI_API_KEY",
    "DEEPSEEK_API_KEY",
    "GEMINI_API_KEY",
  ]) {
    const secret = process.env[key]?.trim();
    if (secret) sanitized = sanitized.replaceAll(secret, "[redacted]");
  }

  return sanitized
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[redacted]")
    .slice(0, 500);
}

function errorDetails(error: unknown): ApiHealthCheck["error"] {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number(error.status)
      : null;
  const code =
    error instanceof ProbeError
      ? error.code
      : status && Number.isFinite(status)
        ? `HTTP_${status}`
        : error instanceof Error && error.message.includes("empty response")
          ? "EMPTY_RESPONSE"
        : error instanceof Error && error.name === "TimeoutError"
          ? "TIMEOUT"
          : "CHECK_FAILED";

  return {
    code,
    message: redact(error instanceof Error ? error.message : String(error)),
  };
}

async function withTimeout<T>(name: string, task: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new ProbeError(`${name} exceeded 60 seconds`, "TIMEOUT")),
      PROBE_TIMEOUT_MS,
    );
  });

  try {
    return await Promise.race([task, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function runCheck(
  name: string,
  probe: () => Promise<HealthDetails>,
): Promise<ApiHealthCheck> {
  const startedAt = performance.now();
  try {
    const details = await withTimeout(name, probe());
    return {
      name,
      status: "pass",
      latencyMs: Math.round(performance.now() - startedAt),
      details,
    };
  } catch (error) {
    return {
      name,
      status: "fail",
      latencyMs: Math.round(performance.now() - startedAt),
      error: errorDetails(error),
    };
  }
}

function skippedCheck(name: string, reason: string): ApiHealthCheck {
  return {
    name,
    status: "skipped",
    latencyMs: 0,
    details: { reason },
  };
}

async function checkOpenRouterAuth(): Promise<HealthDetails> {
  const response = await fetch(OPENROUTER_KEY_URL, {
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new ProbeError(
      `OpenRouter authentication returned HTTP ${response.status}`,
      `HTTP_${response.status}`,
    );
  }

  const payload = (await response.json()) as {
    data?: {
      is_free_tier?: boolean;
      limit_remaining?: number | null;
      expires_at?: string | null;
    };
  };
  if (!payload.data || typeof payload.data !== "object") {
    throw new ProbeError(
      "OpenRouter key endpoint returned an invalid response",
      "INVALID_RESPONSE",
    );
  }

  return {
    authenticated: true,
    freeTier: payload.data.is_free_tier ?? false,
    limitRemaining: payload.data.limit_remaining ?? null,
    expiresAt: payload.data.expires_at ?? null,
  };
}

/** Run detailed live checks without exposing an HTTP endpoint or writing demo data. */
export async function checkApiHealth(): Promise<ApiHealthReport> {
  const checkedAt = new Date().toISOString();
  const startedAt = performance.now();
  const checks: ApiHealthCheck[] = [];

  const missingKeys = REQUIRED_ENV_KEYS.filter(
    (key) => !process.env[key]?.trim(),
  );
  checks.push(
    missingKeys.length === 0
      ? {
          name: "environment",
          status: "pass",
          latencyMs: 0,
          details: {
            requiredKeysConfigured: true,
            openAiFallbackConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
            deepSeekFallbackConfigured: Boolean(
              process.env.DEEPSEEK_API_KEY?.trim(),
            ),
            geminiFallbackConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
          },
        }
      : {
          name: "environment",
          status: "fail",
          latencyMs: 0,
          error: {
            code: "ENV_MISSING",
            message: `Missing required keys: ${missingKeys.join(", ")}`,
          },
        },
  );

  if (missingKeys.length > 0) {
    for (const name of [
      "openrouter-auth",
      "structured-analysis",
      "embedding",
      "supabase-tables",
      "rag-rpcs",
    ]) {
      checks.push(skippedCheck(name, "required environment is incomplete"));
    }
    return {
      status: "unhealthy",
      checkedAt,
      durationMs: Math.round(performance.now() - startedAt),
      checks,
    };
  }

  const authCheck = await runCheck("openrouter-auth", checkOpenRouterAuth);
  checks.push(authCheck);

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let embedding: number[] | null = null;
  if (authCheck.status === "pass") {
    checks.push(
      await runCheck("structured-analysis", async () => {
        const [{ analyzeWithOpenRouter }, { OPENROUTER_ANALYSIS_MODEL }] =
          await Promise.all([
            import("@/features/lingubreak/lib/ai-providers"),
            import("@/features/lingubreak/lib/providers"),
          ]);
        const analysis = await analyzeWithOpenRouter(
          "The cat sleeps on the warm mat.",
          "",
        );
        return {
          requestedModel: OPENROUTER_ANALYSIS_MODEL,
          selectedModel: analysis.model,
          schemaValidated: true,
          chunks: analysis.result.chunks.length,
          pedagogicalSteps: analysis.result.pedagogical_steps.length,
        };
      }),
    );

    checks.push(
      await runCheck("embedding", async () => {
        const { embedText, EMBEDDING_DIM, EMBEDDING_MODEL } = await import(
          "@/shared/lib/rag/embeddings"
        );
        embedding = await embedText("Caffeine API health check");
        if (
          embedding.length !== EMBEDDING_DIM ||
          !embedding.every(Number.isFinite)
        ) {
          throw new ProbeError(
            `Expected ${EMBEDDING_DIM} finite embedding values, received ${embedding.length}`,
            "INVALID_EMBEDDING",
          );
        }
        return {
          model: EMBEDDING_MODEL,
          dimensions: embedding.length,
          finiteValues: true,
        };
      }),
    );
  } else {
    checks.push(
      skippedCheck("structured-analysis", "OpenRouter authentication failed"),
      skippedCheck("embedding", "OpenRouter authentication failed"),
    );
  }

  const tableCheck = await runCheck("supabase-tables", async () => {
    const tables = ["analyses", "kb_documents", "kb_chunks"] as const;
    const results = await Promise.all(
      tables.map(async (table) => {
        const { data, error } = await supabase
          .from(table)
          .select("id")
          .limit(1);
        if (error) {
          throw new ProbeError(
            `${table} is not readable: ${error.message}`,
            error.code || "SUPABASE_TABLE_ERROR",
          );
        }
        return [table, Boolean(data?.length)] as const;
      }),
    );

    return Object.fromEntries(
      results.map(([table, hasRows]) => [`${table}HasRows`, hasRows]),
    );
  });
  checks.push(tableCheck);

  if (embedding && tableCheck.status === "pass") {
    checks.push(
      await runCheck("rag-rpcs", async () => {
        const vector = JSON.stringify(embedding);
        const [kb, analyses] = await Promise.all([
          supabase.rpc("match_kb_chunks", {
            query_embedding: vector,
            match_count: 1,
            filter_category: null,
          }),
          supabase.rpc("match_analyses", {
            query_embedding: vector,
            match_count: 1,
          }),
        ]);

        if (kb.error) {
          throw new ProbeError(
            `match_kb_chunks failed: ${kb.error.message}`,
            kb.error.code || "RAG_RPC_ERROR",
          );
        }
        if (analyses.error) {
          throw new ProbeError(
            `match_analyses failed: ${analyses.error.message}`,
            analyses.error.code || "RAG_RPC_ERROR",
          );
        }

        return {
          matchKbChunks: true,
          kbMatches: Array.isArray(kb.data) ? kb.data.length : 0,
          matchAnalyses: true,
          analysisMatches: Array.isArray(analyses.data)
            ? analyses.data.length
            : 0,
        };
      }),
    );
  } else {
    checks.push(
      skippedCheck(
        "rag-rpcs",
        embedding ? "Supabase table check failed" : "embedding check failed",
      ),
    );
  }

  return {
    status: checks.every((check) => check.status === "pass")
      ? "healthy"
      : "unhealthy",
    checkedAt,
    durationMs: Math.round(performance.now() - startedAt),
    checks,
  };
}
