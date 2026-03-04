/**
 * Feature registry — central list of all MVP features.
 * Used for navigation, feature flags, and conditional rendering.
 */

export interface FeatureConfig {
  id: string;
  name: string;
  nameThai: string;
  route: string;
  enabled: boolean;
  description: string;
}

export const FEATURES: FeatureConfig[] = [
  {
    id: "lingubreak",
    name: "LinguBreak",
    nameThai: "แยกประโยค",
    route: "/lingubreak",
    enabled: true,
    description: "Sentence structure breakdown with Thai logic",
  },
  {
    id: "ocr",
    name: "OCR Reader",
    nameThai: "อ่านรูปภาพ",
    route: "/ocr",
    enabled: false,
    description: "Extract text from uploaded images",
  },
  {
    id: "dictionary",
    name: "Click to Lookup",
    nameThai: "คลิกเพื่อค้นหา",
    route: "/dictionary",
    enabled: false,
    description: "Click any word for instant dictionary lookup",
  },
];

export function getEnabledFeatures(): FeatureConfig[] {
  return FEATURES.filter((f) => f.enabled);
}

export function isFeatureEnabled(id: string): boolean {
  return FEATURES.some((f) => f.id === id && f.enabled);
}
