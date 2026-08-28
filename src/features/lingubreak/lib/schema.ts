import { z } from "zod";

// ── TypeScript Types ────────────────────────────────────────────────

export type ChunkType =
  | "subject"
  | "verb"
  | "object"
  | "relative_clause"
  | "prepositional"
  | "modifier";

export interface AnalysisChunk {
  text: string;
  type: ChunkType;
  explanation: string;
  thai_explanation: string;
}

export interface PedagogicalStep {
  step_number: number;
  title: string;
  title_thai: string;
  description: string;
  description_thai: string;
  highlighted_text: string;
}

export interface AnalysisResult {
  chunks: AnalysisChunk[];
  simplified_english: string;
  thai_translation: string;
  thai_reordered_chunks: AnalysisChunk[];
  pedagogical_steps: PedagogicalStep[];
}

// ── Runtime Validation ──────────────────────────────────────────────

export const AnalysisResultSchema: z.ZodType<AnalysisResult> = z.object({
  chunks: z.array(
    z.object({
      text: z.string(),
      type: z.enum([
        "subject",
        "verb",
        "object",
        "relative_clause",
        "prepositional",
        "modifier",
      ]),
      explanation: z.string(),
      thai_explanation: z.string(),
    }),
  ),
  simplified_english: z.string(),
  thai_translation: z.string(),
  thai_reordered_chunks: z.array(
    z.object({
      text: z.string(),
      type: z.enum([
        "subject",
        "verb",
        "object",
        "relative_clause",
        "prepositional",
        "modifier",
      ]),
      explanation: z.string(),
      thai_explanation: z.string(),
    }),
  ),
  pedagogical_steps: z.array(
    z.object({
      step_number: z.number(),
      title: z.string(),
      title_thai: z.string(),
      description: z.string(),
      description_thai: z.string(),
      highlighted_text: z.string(),
    }),
  ),
});

export function parseAnalysisResult(value: unknown): AnalysisResult {
  return AnalysisResultSchema.parse(value);
}

// ── Learner-friendly grammar color mapping ─────────────────────────

export const CHUNK_COLORS: Record<
  ChunkType,
  { bg: string; text: string; border: string; label: string; labelThai: string }
> = {
  subject: {
    bg: "bg-[#DCEBFF]",
    text: "text-[#164E87]",
    border: "border-[#7CB8F6]",
    label: "Subject",
    labelThai: "ประธาน",
  },
  verb: {
    bg: "bg-[#FFE1DF]",
    text: "text-[#8F3434]",
    border: "border-[#F29A94]",
    label: "Verb",
    labelThai: "กริยา",
  },
  object: {
    bg: "bg-[#D9F7F1]",
    text: "text-[#146D65]",
    border: "border-[#72CFC5]",
    label: "Object",
    labelThai: "กรรม",
  },
  relative_clause: {
    bg: "bg-[#E2F5DA]",
    text: "text-[#3C6B2B]",
    border: "border-[#9DCE88]",
    label: "Relative (ที่)",
    labelThai: "อนุประโยคขยาย (ที่)",
  },
  prepositional: {
    bg: "bg-[#FFF0C7]",
    text: "text-[#7A5311]",
    border: "border-[#E9C565]",
    label: "Prepositional",
    labelThai: "บุพบท",
  },
  modifier: {
    bg: "bg-[#EEE2FF]",
    text: "text-[#634390]",
    border: "border-[#B99ADD]",
    label: "Modifier",
    labelThai: "ตัวขยาย",
  },
};
