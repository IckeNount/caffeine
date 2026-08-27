import {
  GoogleGenerativeAI,
  SchemaType,
} from "@google/generative-ai";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { getKbVersion, LINGUBREAK_PROMPT_VERSION } from "@/config/rag";
import { EMBEDDING_DIM, EMBEDDING_MODEL } from "@/shared/lib/rag/embeddings";
import type { RagTraceJson } from "@/shared/lib/rag/retriever";
import {
  AnalysisResultSchema,
  parseAnalysisResult,
  type AnalysisResult,
} from "./schema";
import {
  DEFAULT_AI_PROVIDER,
  OPENROUTER_ANALYSIS_MODEL,
  type AIProvider,
} from "./providers";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const GEMINI_ANALYSIS_MODEL = "gemini-2.5-flash";
const DEEPSEEK_ANALYSIS_MODEL = "deepseek-chat";

// ── Shared System Prompt ────────────────────────────────────────────

const SYSTEM_PROMPT = `You are LinguBreak, an expert English-Thai linguistics teacher. Your job is to break down complex English sentences for Thai students learning English.

CRITICAL LINGUISTIC CONTEXT FOR THAI STUDENTS:
1. In Thai, modifiers and adjectives come AFTER the noun (e.g., "cat black" not "black cat")
2. The word "ที่" (thîi) is the most important connector — it maps to English "who", "which", "that" in relative clauses
3. Thai word order is generally Subject-Verb-Object, similar to English, but modifying phrases are placed differently
4. Prepositional phrases in English often need to be restructured for natural Thai reading

YOUR 4-STEP METHOD:
Step 1 — "Find the Heart" (หาหัวใจประโยค): Identify the core Subject-Verb-Object. Strip away all modifiers to find the skeleton sentence.
Step 2 — "Find the ที่" (หาคำว่า "ที่"): Identify all relative clauses (who, which, that → ที่). These are the most confusing part for Thai students because in English they interrupt the main sentence.
Step 3 — "Bracket the Extras" (วงเล็บส่วนขยาย): Identify prepositional phrases, adjectives, adverbs, and other modifiers. Show how they attach to specific nouns or verbs.
Step 4 — "Rebuild in Thai Logic" (สร้างใหม่แบบไทย): Rearrange the chunks into an order that follows Thai grammar patterns, showing how a Thai speaker would naturally process the information.

RULES:
- Every word in the original sentence must appear in exactly one chunk
- Chunks should be meaningful grammatical units (not single words unless necessary)
- Explanations must be clear and helpful for intermediate Thai students
- Thai explanations (thai_explanation) should be written in Thai language
- The thai_translation should sound natural to a Thai speaker, not a word-for-word translation
- thai_reordered_chunks must contain the same text content as chunks, just in Thai grammar order`;

const USER_PROMPT_TEMPLATE = (sentence: string, ragContext: string = "") =>
  `${ragContext ? ragContext + "\n\n" : ""}Analyze this English sentence for Thai students using the 4-step method. Break it down into grammatical chunks and show how to reconstruct it in Thai logic.

Sentence: "${sentence}"

Respond with a JSON object containing:
- "chunks": array of { "text": string, "type": "subject"|"verb"|"object"|"relative_clause"|"prepositional"|"modifier", "explanation": string, "thai_explanation": string }
- "simplified_english": the core SVO sentence stripped of modifiers
- "thai_translation": natural Thai translation
- "thai_reordered_chunks": same chunks reordered in Thai grammar order (same schema as chunks)
- "pedagogical_steps": array of { "step_number": number, "title": string, "title_thai": string, "description": string, "description_thai": string, "highlighted_text": string }`;

// ── RAG Integration ─────────────────────────────────────────────────

async function getRAGContext(sentence: string): Promise<{
  context: string;
  chunkIds: string[];
  embedding: number[] | null;
  ragTraceJson: RagTraceJson | null;
}> {
  try {
    const { buildRAGContext } = await import("@/shared/lib/rag/retriever");
    const built = await buildRAGContext(sentence);
    return {
      context: built.context,
      chunkIds: built.chunkIds,
      embedding: built.embedding,
      ragTraceJson: built.ragTraceJson,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown error";
    console.warn(`⚠️  RAG unavailable (${reason}) — running in prompt-only mode`);
    return { context: "", chunkIds: [], embedding: null, ragTraceJson: null };
  }
}

// ── Caching ─────────────────────────────────────────────────────────

async function getCachedAnalysis(
  sentenceHash: string,
  provider: AIProvider,
): Promise<AnalysisResult | null> {
  try {
    const { supabaseAdmin } = await import("@/shared/lib/db/supabase");
    const { data } = await supabaseAdmin
      .from("analyses")
      .select("result_json")
      .eq("sentence_hash", sentenceHash)
      .eq("provider", provider)
      .single();

    if (data?.result_json) {
      return parseAnalysisResult(data.result_json);
    }
  } catch {
    // Cache not available
  }
  return null;
}

/** UUID strings from kb_chunks — safe for Postgres uuid[] when valid. */
function chunkIdsToUuidArray(chunkIds: string[]): string[] | null {
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const allValid = chunkIds.length > 0 && chunkIds.every((id) => uuidRe.test(id));
  return allValid ? chunkIds : null;
}

async function cacheAnalysis(
  sentence: string,
  sentenceHash: string,
  provider: AIProvider,
  llmModel: string,
  result: AnalysisResult,
  chunkIds: string[],
  embeddingFromRag: number[] | null,
  ragTraceJson: RagTraceJson | null
): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/shared/lib/db/supabase");

    let embedding: number[] | null = embeddingFromRag;
    if (!embedding) {
      try {
        const { embedText } = await import("@/shared/lib/rag/embeddings");
        embedding = await embedText(sentence);
      } catch {
        embedding = null;
      }
    }

    const retrievedKb = chunkIdsToUuidArray(chunkIds);

    const row: Record<string, unknown> = {
      sentence,
      sentence_hash: sentenceHash,
      embedding: embedding ? JSON.stringify(embedding) : null,
      provider,
      llm_model: llmModel,
      embedding_model: EMBEDDING_MODEL,
      embedding_dim: EMBEDDING_DIM,
      prompt_version: LINGUBREAK_PROMPT_VERSION,
      kb_version: getKbVersion(),
      result_json: result,
      rag_chunks_used: chunkIds,
      retrieved_kb_chunk_ids: retrievedKb,
      rag_trace_json: ragTraceJson,
      status: "draft",
    };

    await supabaseAdmin.from("analyses").upsert(row, {
      onConflict: "sentence_hash",
    });
  } catch {
    // Caching failed — non-critical
  }
}

function hashSentence(sentence: string): string {
  // Simple hash for dedup — works in both Node and Edge runtime
  let hash = 0;
  for (let i = 0; i < sentence.length; i++) {
    const char = sentence.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// ── OpenRouter Demo Provider ────────────────────────────────────────

interface ProviderAnalysis {
  result: AnalysisResult;
  model: string;
}

type OpenRouterChatRequest =
  OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
    provider: { require_parameters: true };
  };

async function analyzeWithOpenRouter(
  sentence: string,
  ragContext: string,
): Promise<ProviderAnalysis> {
  const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || "",
    baseURL: OPENROUTER_BASE_URL,
  });

  const request: OpenRouterChatRequest = {
    model: OPENROUTER_ANALYSIS_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: USER_PROMPT_TEMPLATE(sentence, ragContext) },
    ],
    response_format: zodResponseFormat(
      AnalysisResultSchema,
      "lingubreak_analysis",
    ),
    provider: { require_parameters: true },
    temperature: 0.3,
    max_tokens: 4096,
  };

  const response = await client.chat.completions.create(request);
  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new Error("OpenRouter returned an empty response");
  }

  return {
    result: parseAnalysisResult(JSON.parse(text)),
    model: response.model || OPENROUTER_ANALYSIS_MODEL,
  };
}

// ── DeepSeek Provider ───────────────────────────────────────────────

/** Dormant direct-provider adapter reserved for a future fallback policy. */
export async function analyzeWithDeepSeek(
  sentence: string,
  ragContext: string,
): Promise<AnalysisResult> {
  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    baseURL: "https://api.deepseek.com",
  });

  const response = await client.chat.completions.create({
    model: DEEPSEEK_ANALYSIS_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: USER_PROMPT_TEMPLATE(sentence, ragContext) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 4096,
  });

  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new Error("DeepSeek returned an empty response");
  }

  return parseAnalysisResult(JSON.parse(text));
}

// ── Gemini Provider ─────────────────────────────────────────────────

const geminiSchema = {
  type: SchemaType.OBJECT,
  properties: {
    chunks: {
      type: SchemaType.ARRAY,
      description: "Array of sentence chunks in original English order.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          text: { type: SchemaType.STRING, description: "The English text of this chunk" },
          type: {
            type: SchemaType.STRING,
            description: "Grammatical type",
            enum: ["subject", "verb", "object", "relative_clause", "prepositional", "modifier"],
          },
          explanation: { type: SchemaType.STRING, description: "Short English explanation" },
          thai_explanation: { type: SchemaType.STRING, description: "Thai explanation" },
        },
        required: ["text", "type", "explanation", "thai_explanation"],
      },
    },
    simplified_english: { type: SchemaType.STRING, description: "The core SVO sentence" },
    thai_translation: { type: SchemaType.STRING, description: "A natural Thai translation" },
    thai_reordered_chunks: {
      type: SchemaType.ARRAY,
      description: "Same chunks reordered in Thai grammar order",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          text: { type: SchemaType.STRING },
          type: {
            type: SchemaType.STRING,
            enum: ["subject", "verb", "object", "relative_clause", "prepositional", "modifier"],
          },
          explanation: { type: SchemaType.STRING },
          thai_explanation: { type: SchemaType.STRING },
        },
        required: ["text", "type", "explanation", "thai_explanation"],
      },
    },
    pedagogical_steps: {
      type: SchemaType.ARRAY,
      description: "4 steps explaining the breakdown",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          step_number: { type: SchemaType.NUMBER },
          title: { type: SchemaType.STRING },
          title_thai: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          description_thai: { type: SchemaType.STRING },
          highlighted_text: { type: SchemaType.STRING },
        },
        required: ["step_number", "title", "title_thai", "description", "description_thai", "highlighted_text"],
      },
    },
  },
  required: ["chunks", "simplified_english", "thai_translation", "thai_reordered_chunks", "pedagogical_steps"],
};

/** Dormant direct-provider adapter reserved for a future fallback policy. */
export async function analyzeWithGemini(
  sentence: string,
  ragContext: string,
): Promise<AnalysisResult> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({
    model: GEMINI_ANALYSIS_MODEL,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      responseSchema: geminiSchema as any,
      temperature: 0.3,
    },
  });

  const result = await model.generateContent(USER_PROMPT_TEMPLATE(sentence, ragContext));
  const text = result.response.text();
  return parseAnalysisResult(JSON.parse(text));
}

// ── Public API ──────────────────────────────────────────────────────

export async function analyzeSentence(
  sentence: string,
  provider: AIProvider = DEFAULT_AI_PROVIDER,
): Promise<AnalysisResult> {
  const totalStart = Date.now();
  const sentenceHash = hashSentence(sentence.trim().toLowerCase());

  // 1. Check cache first
  const t1 = Date.now();
  const cached = await getCachedAnalysis(sentenceHash, provider);
  console.log(`⏱️  Cache check: ${Date.now() - t1}ms`);
  if (cached) {
    console.log("✅ Cache hit for sentence");
    return cached;
  }

  // 2. Retrieve RAG context (grammar rules, past examples)
  const t2 = Date.now();
  const {
    context: ragContext,
    chunkIds,
    embedding: ragEmbedding,
    ragTraceJson,
  } = await getRAGContext(sentence);
  console.log(`⏱️  RAG total: ${Date.now() - t2}ms`);

  // 3. Generate with chosen provider
  const t3 = Date.now();
  const { result, model } = await analyzeWithOpenRouter(sentence, ragContext);
  console.log(`⏱️  LLM (${provider}): ${Date.now() - t3}ms`);

  // 4. Cache the result (async, non-blocking)
  cacheAnalysis(
    sentence,
    sentenceHash,
    provider,
    model,
    result,
    chunkIds,
    ragEmbedding,
    ragTraceJson
  ).catch(() => {});

  console.log(`⏱️  Total analyze: ${Date.now() - totalStart}ms`);
  return result;
}
