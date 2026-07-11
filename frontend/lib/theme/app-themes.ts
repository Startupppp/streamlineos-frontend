export const APP_THEME_STORAGE_KEY = "streamlineos-app-theme";

export const APP_THEMES = [
  { id: "default", label: "Ink", swatch: "#0b1220" },
  { id: "red", label: "Red", swatch: "#dc2626" },
  { id: "orange", label: "Orange", swatch: "#ea580c" },
  { id: "amber", label: "Amber", swatch: "#fbbf24" },
  { id: "yellow", label: "Yellow", swatch: "#facc15" },
  { id: "lime", label: "Lime", swatch: "#a3e635" },
  { id: "green", label: "Green", swatch: "#16a34a" },
  { id: "emerald", label: "Emerald", swatch: "#059669" },
  { id: "teal", label: "Teal", swatch: "#0d9488" },
  { id: "cyan", label: "Cyan", swatch: "#0891b2" },
  { id: "sky", label: "Sky", swatch: "#0284c7" },
  { id: "blue", label: "Blue", swatch: "#2563eb" },
  { id: "indigo", label: "Indigo", swatch: "#4f46e5" },
  { id: "violet", label: "Violet", swatch: "#7c3aed" },
  { id: "purple", label: "Purple", swatch: "#9333ea" },
  { id: "fuchsia", label: "Fuchsia", swatch: "#c026d3" },
  { id: "pink", label: "Pink", swatch: "#db2777" },
  { id: "rose", label: "Rose", swatch: "#e11d48" },
] as const;

export type AppTheme = (typeof APP_THEMES)[number];
export type AppThemeId = AppTheme["id"];

export const DEFAULT_APP_THEME: AppThemeId = "default";

export function isAppThemeId(value: unknown): value is AppThemeId {
  return APP_THEMES.some((theme) => theme.id === value);
}

export function getAppThemeClass(id: AppThemeId): string {
  return `theme-${id}`;
}

export function getSelectableThemeIds(): string[] {
  return APP_THEMES.filter(isNonDefaultTheme).map(getThemeId);
}

function isNonDefaultTheme(theme: AppTheme): boolean {
  return theme.id !== DEFAULT_APP_THEME;
}

function getThemeId(theme: AppTheme): string {
  return theme.id;
}
