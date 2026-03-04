import {
  GoogleGenerativeAI,
  SchemaType,
} from "@google/generative-ai";
import OpenAI from "openai";
import { AnalysisResult } from "./schema";

// ── Provider Types ──────────────────────────────────────────────────

export type AIProvider = "deepseek" | "gemini";

export interface ProviderInfo {
  id: AIProvider;
  name: string;
  icon: string;
  description: string;
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "deepseek",
    name: "DeepSeek",
    icon: "🤖",
    description: "DeepSeek Chat — fast & affordable",
  },
  {
    id: "gemini",
    name: "Gemini",
    icon: "✨",
    description: "Google Gemini 2.0 Flash",
  },
];

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

let ragAvailable = false;

async function getRAGContext(sentence: string): Promise<{ context: string; chunkIds: string[] }> {
  try {
    // Dynamically import to avoid crashes when Supabase isn't configured
    const { buildRAGContext } = await import("@/shared/lib/rag/retriever");
    ragAvailable = true;
    return await buildRAGContext(sentence);
  } catch (err) {
    // RAG failed — fall back to prompt-only mode
    const reason = err instanceof Error ? err.message : "unknown error";
    console.warn(`⚠️  RAG unavailable (${reason}) — running in prompt-only mode`);
    return { context: "", chunkIds: [] };
  }
}

// ── Caching ─────────────────────────────────────────────────────────

async function getCachedAnalysis(sentenceHash: string): Promise<AnalysisResult | null> {
  try {
    const { supabaseAdmin } = await import("@/shared/lib/db/supabase");
    const { data } = await supabaseAdmin
      .from("analyses")
      .select("result_json")
      .eq("sentence_hash", sentenceHash)
      .single();

    if (data?.result_json) {
      return data.result_json as AnalysisResult;
    }
  } catch {
    // Cache not available
  }
  return null;
}

async function cacheAnalysis(
  sentence: string,
  sentenceHash: string,
  provider: AIProvider,
  result: AnalysisResult,
  chunkIds: string[]
): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/shared/lib/db/supabase");

    // Try to get embedding, but don't block caching if it fails
    let embedding: number[] | null = null;
    try {
      const { embedText } = await import("@/shared/lib/rag/embeddings");
      embedding = await embedText(sentence);
    } catch {
      // Embedding unavailable (e.g. Gemini timeout) — cache without it
    }

    await supabaseAdmin.from("analyses").upsert({
      sentence,
      sentence_hash: sentenceHash,
      embedding: embedding ? JSON.stringify(embedding) : null,
      provider,
      result_json: result,
      rag_chunks_used: chunkIds,
      status: "draft",
    }, { onConflict: "sentence_hash" });
  } catch {
    // Caching failed — non-critical, continue
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

// ── DeepSeek Provider ───────────────────────────────────────────────

async function analyzeWithDeepSeek(sentence: string, ragContext: string): Promise<AnalysisResult> {
  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    baseURL: "https://api.deepseek.com",
  });

  const response = await client.chat.completions.create({
    model: "deepseek-chat",
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

  return JSON.parse(text) as AnalysisResult;
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

async function analyzeWithGemini(sentence: string, ragContext: string): Promise<AnalysisResult> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
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
  return JSON.parse(text) as AnalysisResult;
}

// ── Public API ──────────────────────────────────────────────────────

export async function analyzeSentence(
  sentence: string,
  provider: AIProvider = "deepseek"
): Promise<AnalysisResult> {
  const totalStart = Date.now();
  const sentenceHash = hashSentence(sentence.trim().toLowerCase());

  // 1. Check cache first
  const t1 = Date.now();
  const cached = await getCachedAnalysis(sentenceHash);
  console.log(`⏱️  Cache check: ${Date.now() - t1}ms`);
  if (cached) {
    console.log("✅ Cache hit for sentence");
    return cached;
  }

  // 2. Retrieve RAG context (grammar rules, past examples)
  const t2 = Date.now();
  const { context: ragContext, chunkIds } = await getRAGContext(sentence);
  console.log(`⏱️  RAG total: ${Date.now() - t2}ms`);

  // 3. Generate with chosen provider
  const t3 = Date.now();
  let result: AnalysisResult;
  switch (provider) {
    case "deepseek":
      result = await analyzeWithDeepSeek(sentence, ragContext);
      break;
    case "gemini":
      result = await analyzeWithGemini(sentence, ragContext);
      break;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
  console.log(`⏱️  LLM (${provider}): ${Date.now() - t3}ms`);

  // 4. Cache the result (async, non-blocking)
  cacheAnalysis(sentence, sentenceHash, provider, result, chunkIds).catch(() => {});

  console.log(`⏱️  Total analyze: ${Date.now() - totalStart}ms`);
  return result;
}
