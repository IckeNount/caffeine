export type AIProvider = "openrouter";
export type DirectAIProvider = "deepseek" | "gemini";

export const DEFAULT_AI_PROVIDER: AIProvider = "openrouter";
export const OPENROUTER_ANALYSIS_MODEL = "openrouter/free";

export interface ProviderInfo {
  id: AIProvider;
  name: string;
  icon: string;
  description: string;
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "openrouter",
    name: "OpenRouter",
    icon: "↗️",
    description: "Free model router",
  },
];

export function isAIProvider(value: unknown): value is AIProvider {
  return value === DEFAULT_AI_PROVIDER;
}
