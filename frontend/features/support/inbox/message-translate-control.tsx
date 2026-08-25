"use client";

import { useCallback, useState } from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useTranslateMessage } from "@/hooks/api/support/ai";

const LANGUAGES = [
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Hindi",
  "Mandarin Chinese",
  "Japanese",
  "Arabic",
  "English",
];

interface MessageTranslateControlProps {
  ticketId: number;
  messageId: number;
}

export function MessageTranslateControl({ ticketId, messageId }: MessageTranslateControlProps) {
  const [open, setOpen] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("Spanish");
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const translate = useTranslateMessage(ticketId);

  const handleOpenChange = useCallback((v: boolean) => setOpen(v), []);
  const handleLanguageChange = useCallback((v: string) => setTargetLanguage(v), []);

  const handleTranslate = useCallback(() => {
    translate.mutate(
      { messageId, targetLanguage },
      {
        onSuccess: (result) => {
          if (!result) {
            toast.info("Translation is unavailable right now");
            return;
          }
          setTranslatedText(result.translatedText);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [translate, messageId, targetLanguage]);

  return (
    <div className="mt-1">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 text-dense px-1.5 gap-1 text-muted-foreground">
            <Languages className="h-3 w-3" /> Translate
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="flex items-center gap-1.5">
            <Select value={targetLanguage} onValueChange={handleLanguageChange}>
              <SelectTrigger className="h-9 text-sm flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <LoadingButton
              variant="outline"
              size="sm"
              className="h-9 text-sm shrink-0"
              isPending={translate.isPending}
              onClick={handleTranslate}
            >
              Go
            </LoadingButton>
          </div>
        </PopoverContent>
      </Popover>
      {translatedText && (
        <p className="text-xs mt-1 whitespace-pre-wrap bg-muted/40 rounded px-2 py-1 border border-border/40">
          {translatedText}
        </p>
      )}
    </div>
  );
}
