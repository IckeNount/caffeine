// Feature barrel export — LinguBreak
export { useAnalyze } from "./hooks/useAnalyze";
export { analyzeSentence } from "./lib/ai-providers";
export {
  DEFAULT_AI_PROVIDER,
  OPENROUTER_ANALYSIS_MODEL,
  PROVIDERS,
} from "./lib/providers";
export type { AIProvider, DirectAIProvider, ProviderInfo } from "./lib/providers";
export type { AnalysisResult, AnalysisChunk, ChunkType, PedagogicalStep } from "./lib/schema";
export { AnalysisResultSchema, CHUNK_COLORS, parseAnalysisResult } from "./lib/schema";
