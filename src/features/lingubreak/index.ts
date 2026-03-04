// Feature barrel export — LinguBreak
export { useAnalyze } from "./hooks/useAnalyze";
export { analyzeSentence, PROVIDERS } from "./lib/ai-providers";
export type { AIProvider, ProviderInfo } from "./lib/ai-providers";
export type { AnalysisResult, AnalysisChunk, ChunkType, PedagogicalStep } from "./lib/schema";
export { CHUNK_COLORS } from "./lib/schema";
