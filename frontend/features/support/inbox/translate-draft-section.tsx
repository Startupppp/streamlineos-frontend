"use client";

import { useState, useCallback } from "react";
import { Globe } from "lucide-react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslateDraft } from "@/hooks/api/support/ai";
import { getErrorMessage } from "@/lib/get-error-message";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ja", label: "Japanese" },
  { value: "pt", label: "Portuguese" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
] as const;

type LanguageCode = (typeof LANGUAGES)[number]["value"];

interface TranslateDraftSectionProps {
  ticketId: number;
  currentContent?: string;
  onApply: (translated: string) => void;
}

export function TranslateDraftSection({
  ticketId,
  currentContent,
  onApply,
}: TranslateDraftSectionProps) {
  const [language, setLanguage] = useState<LanguageCode>("es");
  const [result, setResult] = useState<{
    translatedText: string;
    detectedSourceLanguage: string;
  } | null>(null);
  const translateDraft = useTranslateDraft(ticketId);

  const handleLanguageChange = useCallback((val: string) => {
    setLanguage(val as LanguageCode);
    setResult(null);
  }, []);

  const handleTranslate = useCallback(() => {
    translateDraft.mutate(
      { language, content: currentContent },
      {
        onSuccess: (data) => {
          if (data) setResult(data);
          else toast.info("Translation not available");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [translateDraft, language, currentContent]);

  const handleApply = useCallback(() => {
    if (result) {
      onApply(result.translatedText);
      setResult(null);
      toast.success("Translation applied");
    }
  }, [result, onApply]);

  const handleDiscard = useCallback(() => setResult(null), []);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <Select value={language} onValueChange={handleLanguageChange}>
          <SelectTrigger className="h-7 text-xs w-[120px] border-input bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.value} value={lang.value} className="text-xs">
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <LoadingButton
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          isPending={translateDraft.isPending}
          loadingText="Translating…"
          onClick={handleTranslate}
        >
          Translate draft
        </LoadingButton>
      </div>

      {result && (
        <div className="rounded-md border border-border/60 bg-muted/30 p-2 space-y-1.5">
          {result.detectedSourceLanguage && (
            <p className="text-[10px] text-muted-foreground">
              Detected: {result.detectedSourceLanguage}
            </p>
          )}
          <p className="text-[12px] text-foreground/90 whitespace-pre-wrap line-clamp-6">
            {result.translatedText}
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 text-xs"
              onClick={handleApply}
            >
              Apply
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={handleDiscard}
            >
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
