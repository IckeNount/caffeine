import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { OPENROUTER_ANALYSIS_MODEL } from "@/features/lingubreak/lib/providers";
import {
  DailyReadingAdaptationSchema,
  DailyReadingSchema,
  type DailyReading,
} from "./schema";
import { fetchDailyReadingSource } from "./source";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/";
const ADAPTATION_NOTICE =
  "Adapted and simplified from Simple English Wikipedia; changes were made.";

type OpenRouterDailyRequest =
  OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
    provider: { require_parameters: true };
  };

export async function generateDailyReading(
  date: Date = new Date(),
): Promise<DailyReading> {
  const source = await fetchDailyReadingSource(date);
  const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || "",
    baseURL: OPENROUTER_BASE_URL,
    maxRetries: 0,
    timeout: 30_000,
  });
  const request: OpenRouterDailyRequest = {
    model: OPENROUTER_ANALYSIS_MODEL,
    messages: [
      {
        role: "system",
        content: `You create short English readings for Thai learners ages 10–13 at CEFR A2–B1.

This is a simple rewrite. Begin the requested JSON immediately without planning or explanation.

Use only facts explicitly present in the supplied source. Write a neutral, educational paragraph of 60–100 words in exactly 3 or 4 complete sentences. Prefer common vocabulary and clear sentence structure while keeping important names and numbers accurate.

Never include graphic violence, sexual content, drugs, self-harm, hate, sensational crime, partisan persuasion, or instructions for dangerous activities. Return the paragraph and the exact same text split into its sentence array.`,
      },
      {
        role: "user",
        content: `Source title: ${source.title}\n\nSource extract:\n${source.extract.slice(0, 1_000)}`,
      },
    ],
    response_format: zodResponseFormat(
      DailyReadingAdaptationSchema,
      "daily_reading",
    ),
    provider: { require_parameters: true },
    reasoning_effort: "low",
    temperature: 0.2,
    max_tokens: 4_096,
  };

  const response = await client.chat.completions.create(request);
  const choice = response.choices[0];
  const content = choice?.message?.content;
  if (!content) {
    throw new Error(
      `OpenRouter returned an empty daily reading (model=${response.model || OPENROUTER_ANALYSIS_MODEL}, finish_reason=${choice?.finish_reason || "unknown"})`,
    );
  }

  const adaptation = DailyReadingAdaptationSchema.parse(JSON.parse(content));
  return DailyReadingSchema.parse({
    ...adaptation,
    generatedDate: date.toISOString().slice(0, 10),
    source: {
      title: source.title,
      url: source.url,
      licenseName: "CC BY-SA 4.0",
      licenseUrl: LICENSE_URL,
    },
    adaptationNotice: ADAPTATION_NOTICE,
  });
}
