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

// ── Neo-Brutal × ROV Color Mapping ─────────────────────────────────

export const CHUNK_COLORS: Record<
  ChunkType,
  { bg: string; text: string; border: string; label: string; labelThai: string }
> = {
  subject: {
    bg: "bg-[#3B82F6]",
    text: "text-white",
    border: "border-black",
    label: "Subject",
    labelThai: "ประธาน",
  },
  verb: {
    bg: "bg-[#FF4D4D]",
    text: "text-white",
    border: "border-black",
    label: "Verb",
    labelThai: "กริยา",
  },
  object: {
    bg: "bg-[#00E5C7]",
    text: "text-black",
    border: "border-black",
    label: "Object",
    labelThai: "กรรม",
  },
  relative_clause: {
    bg: "bg-[#22C55E]",
    text: "text-white",
    border: "border-black",
    label: "Relative (ที่)",
    labelThai: "อนุประโยคขยาย (ที่)",
  },
  prepositional: {
    bg: "bg-[#F59E0B]",
    text: "text-black",
    border: "border-black",
    label: "Prepositional",
    labelThai: "บุพบท",
  },
  modifier: {
    bg: "bg-[#A855F7]",
    text: "text-white",
    border: "border-black",
    label: "Modifier",
    labelThai: "ตัวขยาย",
  },
};
