"use client";

import { useCallback, useEffect, useState } from "react";
import { orgScopedStorageKey } from "@/lib/org-scoped-storage";
import {
  companionVoiceSettingsSchema,
  DEFAULT_COMPANION_VOICE_SETTINGS,
  type CompanionVoiceSettings,
} from "./companion-voice-settings";

export function useCompanionVoiceSettings(scope: string) {
  const [settings, setSettings] = useState<CompanionVoiceSettings>(DEFAULT_COMPANION_VOICE_SETTINGS);
  const key = orgScopedStorageKey("companion-voice-settings", scope);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const stored = companionVoiceSettingsSchema.safeParse(JSON.parse(window.localStorage.getItem(key) ?? "null"));
        setSettings(stored.success ? stored.data : DEFAULT_COMPANION_VOICE_SETTINGS);
      } catch {
        setSettings(DEFAULT_COMPANION_VOICE_SETTINGS);
      }
    });
    return () => { cancelled = true; };
  }, [key]);

  const update = useCallback((next: CompanionVoiceSettings) => {
    const parsed = companionVoiceSettingsSchema.parse(next);
    setSettings(parsed);
    try { window.localStorage.setItem(key, JSON.stringify(parsed)); } catch { /* Browser storage may be unavailable. */ }
  }, [key]);

  return { settings, update };
}
