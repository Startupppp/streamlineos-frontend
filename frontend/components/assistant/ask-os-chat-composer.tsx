import type { ChangeEvent, FormEvent } from "react";
import { PauseIcon, SendIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { cn } from "@/lib/utils";
import {
  FIELD_CONTROL_CLASS,
  FIELD_CONTROL_DISABLED_CLASS,
  FIELD_CONTROL_INVALID_CLASS,
} from "@/components/ui/field-control";
import { askOsInputError } from "./ask-os-request-policy";
import {
  PersonaChipStrip,
  type PersonaId,
} from "./persona-chip-strip";

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
      <div className="flex items-center gap-2">
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
            "min-w-0 flex-1 px-3",
          )}
        />
        {isStreaming ? (
          <AnimatedIconButton
            type="button"
            icon={PauseIcon}
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={onStop}
            aria-label="Stop"
          />
        ) : (
          <AnimatedIconButton
            type="submit"
            icon={SendIcon}
            size="icon"
            className="h-9 w-9 shrink-0"
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
