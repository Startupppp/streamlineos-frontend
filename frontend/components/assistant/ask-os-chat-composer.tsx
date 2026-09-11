import type { ChangeEvent, FormEvent } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PersonaChipStrip,
  type PersonaId,
} from "./persona-chip-strip";

interface AskOsChatComposerProps {
  input: string;
  isStreaming: boolean;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSelectPersona: (persona: PersonaId | null) => void;
  onStop: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  selectedPersona: PersonaId | null;
}

export function AskOsChatComposer({
  input,
  isStreaming,
  onInputChange,
  onSelectPersona,
  onStop,
  onSubmit,
  selectedPersona,
}: AskOsChatComposerProps) {
  return (
    <>
      <div className="shrink-0 border-t border-border bg-background/60 px-3 pt-2">
        <PersonaChipStrip
          selected={selectedPersona}
          onSelect={onSelectPersona}
          className="pb-1.5"
        />
      </div>
      <form
        onSubmit={onSubmit}
        className="flex shrink-0 items-center gap-2 bg-background/60 px-3 pb-3"
      >
        <input
          type="text"
          value={input}
          onChange={onInputChange}
          placeholder="Ask anything about your organization…"
          disabled={isStreaming}
          className="h-10 flex-1 rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
        />
        {isStreaming ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-10 w-10 shrink-0 rounded-xl"
            onClick={onStop}
            aria-label="Stop"
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl"
            disabled={!input.trim()}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </form>
    </>
  );
}
