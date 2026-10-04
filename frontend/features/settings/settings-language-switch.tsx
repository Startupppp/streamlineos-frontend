"use client";

import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateMyLanguage } from "@/hooks/api/me-preferences";
import { useLanguage, useT } from "@/lib/i18n/i18n";
import { LANGUAGES, LANGUAGE_LABELS, type Language } from "@/lib/i18n/languages";

function isLanguage(value: string): value is Language {
  return LANGUAGES.some((candidate) => candidate === value);
}

export function SettingsLanguageSwitch() {
  const t = useT();
  const language = useLanguage();
  const updateLanguage = useUpdateMyLanguage();

  function handleLanguageChange(value: string) {
    if (!isLanguage(value) || value === language) return;
    updateLanguage.mutate(value, {
      onError: () => toast.error(t("settings.languageSaveFailed")),
    });
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="language-select" className="text-label font-medium">
        {t("settings.language")}
      </Label>
      <Select value={language} onValueChange={handleLanguageChange}>
        <SelectTrigger id="language-select" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((code) => (
            <SelectItem key={code} value={code} lang={code}>
              {LANGUAGE_LABELS[code]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-dense text-muted-foreground">{t("settings.languageHint")}</p>
    </div>
  );
}
