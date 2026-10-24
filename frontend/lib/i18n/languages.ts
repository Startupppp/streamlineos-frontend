export const LANGUAGES = ["en", "hi", "te"] as const;

export type Language = (typeof LANGUAGES)[number];

