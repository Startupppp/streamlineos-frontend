import type { ChangeEvent, FormEvent } from "react";
import { PauseIcon, SendIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { cn } from "@/lib/utils";
import {
  FIELD_CONTROL_CLASS,
  FIELD_CONTROL_DISABLED_CLASS,
  FIELD_CONTROL_INVALID_CLASS,
} from "@/components/ui/field-control";
import { askOsInputError, type PersonaId } from "./ask-os-request-policy";
import { PersonaChipStrip } from "./persona-chip-strip";

const COMPOSER_INPUT_ID = "ask-os-message";
const COMPOSER_ERROR_ID = "ask-os-message-error";

interface AskOsChatComposerProps {
  error: string | null;
  input: string;
  isStreaming: boolean;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSelectPersona: (persona: PersonaId | null) => void;
  onStop: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  selectedPersona: PersonaId | null;
}

export function AskOsChatComposer({
  error,
  input,
  isStreaming,
  onInputChange,
  onSelectPersona,
  onStop,
  onSubmit,
  selectedPersona,
}: AskOsChatComposerProps) {
  const lengthError = askOsInputError(input);
  const shownError = lengthError ?? error;
  const sendBlocked = !input.trim() || Boolean(lengthError);

  return (
    <form
      onSubmit={onSubmit}
      className="shrink-0 border-t border-border/70 px-3 pb-3 pt-2"
    >
      <PersonaChipStrip
        selected={selectedPersona}
        onSelect={onSelectPersona}
        className="pb-2"
      />
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border bg-card px-2 py-1.5 shadow-sm",
          shownError ? "border-destructive" : "border-border",
        )}
      >
        <input
          id={COMPOSER_INPUT_ID}
          type="text"
          value={input}
          onChange={onInputChange}
          placeholder="Ask anything about your organization…"
          disabled={isStreaming}
          aria-invalid={Boolean(shownError)}
          aria-describedby={shownError ? COMPOSER_ERROR_ID : undefined}
          className={cn(
            FIELD_CONTROL_CLASS,
            FIELD_CONTROL_DISABLED_CLASS,
            FIELD_CONTROL_INVALID_CLASS,
            "h-8 min-w-0 flex-1 border-0 bg-transparent px-2 shadow-none focus-visible:border-transparent focus-visible:ring-0",
          )}
        />
        {isStreaming ? (
          <AnimatedIconButton
            type="button"
            icon={PauseIcon}
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full"
            onClick={onStop}
            aria-label="Stop"
          />
        ) : (
          <AnimatedIconButton
            type="submit"
            icon={SendIcon}
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full"
            disabled={sendBlocked}
            aria-label="Send"
          />
        )}
      </div>
      {shownError ? (
        <p
          id={COMPOSER_ERROR_ID}
          role="alert"
          className="pt-1.5 text-xs leading-snug text-destructive"
        >
          {shownError}
        </p>
      ) : null}
    </form>
  );
}
