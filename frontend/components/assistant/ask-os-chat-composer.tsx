import type { ChangeEvent, FormEvent, Ref } from "react";
import { PauseIcon, SendIcon } from "@animateicons/react/lucide";
import { Mic, MicOff } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { cn } from "@/lib/utils";
import {
  FIELD_CONTROL_CLASS,
  FIELD_CONTROL_DISABLED_CLASS,
  FIELD_CONTROL_INVALID_CLASS,
} from "@/components/ui/field-control";
import { askOsInputError, type PersonaId } from "./ask-os-request-policy";
import { PersonaChipStrip } from "./persona-chip-strip";
import type { SpeechInputController } from "./use-browser-speech";

const COMPOSER_INPUT_ID = "ask-os-message";
const COMPOSER_ERROR_ID = "ask-os-message-error";
const VOICE_HELP_ID = "ask-os-voice-help";

interface AskOsChatComposerProps {
  error: string | null;
  input: string;
  isStreaming: boolean;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onVoiceTranscript: (transcript: string) => void;
  onSelectPersona: (persona: PersonaId | null) => void;
  onStop: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  selectedPersona: PersonaId | null;
  speech: SpeechInputController;
  inputRef?: Ref<HTMLInputElement>;
}

export function AskOsChatComposer({
  error,
  input,
  inputRef,
  isStreaming,
  selectedPersona,
  speech,
  onStop,
  onSubmit,
  onInputChange,
  onVoiceTranscript,
  onSelectPersona,
}: AskOsChatComposerProps) {
  const lengthError = askOsInputError(input);
  const shownError = lengthError ?? error;
  const sendBlocked = !input.trim() || Boolean(lengthError);
  const voiceBusy = speech.state === "listening" || speech.state === "processing";

  function handleVoiceToggle() {
    if (speech.state === "listening") {
      speech.stop();
      return;
    }
    if (speech.state === "processing") {
      speech.cancel();
      return;
    }
    speech.start(onVoiceTranscript);
  }

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
          ref={inputRef}
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
        <button
          type="button"
          onClick={handleVoiceToggle}
          disabled={isStreaming || !speech.supported}
          aria-label={voiceBusy ? "Stop voice input" : "Start voice input"}
          aria-pressed={voiceBusy}
          aria-describedby={!speech.supported ? VOICE_HELP_ID : undefined}
          title={speech.supported ? "Voice input" : "Voice input is not supported in this browser"}
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45",
            voiceBusy && "bg-primary/10 text-primary",
          )}
        >
          {voiceBusy ? <MicOff className="size-4" aria-hidden /> : <Mic className="size-4" aria-hidden />}
        </button>
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
      {speech.interimTranscript ? (
        <p className="pt-1.5 text-xs leading-snug text-muted-foreground" aria-live="polite">
          Hearing: {speech.interimTranscript}
        </p>
      ) : speech.message ? (
        <p
          className={cn(
            "pt-1.5 text-xs leading-snug",
            speech.state === "error" ? "text-destructive" : "text-muted-foreground",
          )}
          role={speech.state === "error" ? "alert" : "status"}
        >
          {speech.message}
        </p>
      ) : !speech.supported ? (
        <p id={VOICE_HELP_ID} className="pt-1.5 text-xs leading-snug text-muted-foreground">
          Voice input isn’t available in this browser. You can keep typing.
        </p>
      ) : null}
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
