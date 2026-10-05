"use client";

import { createContext, useCallback, useContext, useEffect, type ReactNode } from "react";
import { useMyPreferences } from "@/hooks/api/me-preferences";
import type { Language } from "./languages";
import { en, type MessageKey } from "./messages/en";
import { hi } from "./messages/hi";
import { te } from "./messages/te";

export type MessageVars = Readonly<Record<string, string | number>>;

const CATALOGS: Readonly<Record<Language, Record<MessageKey, string>>> = { en, hi, te };

export function translate(language: Language, key: MessageKey, vars?: MessageVars): string {
  const template = CATALOGS[language]?.[key] || en[key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    vars[name] === undefined ? match : String(vars[name]),
  );
}

const LanguageContext = createContext<Language>("en");

export function I18nProvider({ children }: { children: ReactNode }) {
  const { data } = useMyPreferences();
  const language = data?.language ?? "en";

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): Language {
  return useContext(LanguageContext);
}

export function useT() {
  const language = useLanguage();
  return useCallback(
    (key: MessageKey, vars?: MessageVars) => translate(language, key, vars),
    [language],
  );
}
