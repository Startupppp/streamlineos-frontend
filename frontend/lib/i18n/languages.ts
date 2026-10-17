export const LANGUAGES = ["en", "hi", "te"] as const;

export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Readonly<Record<Language, string>> = {
  en: "English",
  hi: "हिन्दी",
  te: "తెలుగు",
};
