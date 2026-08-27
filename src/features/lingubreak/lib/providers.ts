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
    description: "Google Gemini 2.5 Flash",
  },
];

export function isAIProvider(value: unknown): value is AIProvider {
  return value === "deepseek" || value === "gemini";
}
