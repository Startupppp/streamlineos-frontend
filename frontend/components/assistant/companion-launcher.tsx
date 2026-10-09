"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Mic, MicOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useCompanionHeartbeat,
  useCompanionPreferences,
  useUpdateCompanionPreferences,
} from "@/hooks/api/companion";
import type { CompanionPreference } from "@/hooks/api/companion-schema";
import { orgScopedStorageKey, useOrgStorageScope } from "@/lib/org-scoped-storage";
import { cn } from "@/lib/utils";
import type { AskOsCompanionState } from "./ask-os-companion-state";
import { useAskOs } from "./ask-os-context";
import { CompanionCharacter, type CompanionActivity } from "./companion-character";
import { CompanionPromptBubble } from "./companion-prompt-bubble";

const INTRO_KEY = "companion-intro-seen";
const HEARTBEAT_MS = 60_000;
const PET_STATE: Record<AskOsCompanionState | "quiet", { visual: CompanionActivity; label: string }> = {
  idle: { visual: "idle", label: "Ready" },
  quiet: { visual: "quiet", label: "Prompts paused" },
  thinking: { visual: "thinking", label: "Working" },
  clarification: { visual: "clarification", label: "Needs your answer" },
  "partial-evidence": { visual: "idle", label: "Partly answered" },
  "proposal-ready": { visual: "proposal", label: "Review the proposal" },
  "confirmation-pending": { visual: "thinking", label: "Confirming" },
  success: { visual: "success", label: "Done" },
  conflict: { visual: "error", label: "Nothing was saved" },
  denied: { visual: "error", label: "Not allowed" },
  disconnected: { visual: "error", label: "Connection needed" },
  failed: { visual: "error", label: "Something went wrong" },
  stopped: { visual: "idle", label: "Stopped" },
};

export function useCompanionPresence(): CompanionPreference | null {
  const { data } = useCompanionPreferences();
  return useMemo(
    () => (data && data.policy.petEnabled && data.preferences.visible ? data.preferences : null),
    [data],
  );
}

const SILENT: ReadonlySet<CompanionActivity> = new Set(["idle", "thinking", "quiet"]);

export function companionPetState(state: AskOsCompanionState | "quiet") {
  return PET_STATE[state];
}

export function companionDisplayName(preferences: CompanionPreference): string {
  return preferences.name?.trim() || "Companion";
}

function readIntroSeen(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return true;
  }
}

function writeIntroSeen(key: string) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    return;
  }
}

function newSessionId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "00000000-0000-4000-8000-000000000000";
}

function useForegroundHeartbeat(enabled: boolean) {
  const { mutate } = useCompanionHeartbeat();
  useEffect(() => {
    if (!enabled) return;
    const sessionId = newSessionId();
    const isForeground = () => document.visibilityState === "visible" && document.hasFocus();
    let visibleSince = isForeground() ? Date.now() : null;
    let accrued = 0;
    function handleForegroundChange() {
      if (isForeground()) {
        if (visibleSince !== null) return;
        visibleSince = Date.now();
      } else if (visibleSince !== null) {
        accrued += Date.now() - visibleSince;
        visibleSince = null;
      }
    }
    function handleTick() {
      if (!isForeground() || visibleSince === null) return;
      const now = Date.now();
      const seconds = Math.min(120, Math.round((accrued + now - visibleSince) / 1000));
      accrued = 0;
      visibleSince = now;
      if (seconds > 0) mutate({ sessionId, foregroundSeconds: seconds });
    }
    document.addEventListener("visibilitychange", handleForegroundChange);
    window.addEventListener("focus", handleForegroundChange);
    window.addEventListener("blur", handleForegroundChange);
    const timer = window.setInterval(handleTick, HEARTBEAT_MS);
    return () => {
      document.removeEventListener("visibilitychange", handleForegroundChange);
      window.removeEventListener("focus", handleForegroundChange);
      window.removeEventListener("blur", handleForegroundChange);
      window.clearInterval(timer);
    };
  }, [enabled, mutate]);
}

interface CompanionLauncherProps {
  state: AskOsCompanionState;
  preferences: CompanionPreference;
  onVoiceStart?: () => void;
  onVoiceDismiss?: () => void;
  onVoiceReview?: () => void;
  voiceState?: "idle" | "requesting" | "listening" | "processing" | "error";
  voiceSupported?: boolean;
  voiceMessage?: string | null;
  voiceCaption?: string;
  voiceOverlayOpen?: boolean;
}

export function CompanionLauncher({
  state: chatState,
  preferences,
  onVoiceStart,
  onVoiceDismiss,
  onVoiceReview,
  voiceState = "idle",
  voiceSupported = false,
  voiceMessage,
  voiceCaption,
  voiceOverlayOpen = false,
}: CompanionLauncherProps) {
  const router = useRouter();
  const { open, setOpen, toggle } = useAskOs();
  const scope = useOrgStorageScope();
  const introKey = orgScopedStorageKey(INTRO_KEY, scope);
  const [introSeen, setIntroSeen] = useState(() => readIntroSeen(introKey));
  const [now, setNow] = useState(Date.now);
  const updatePreferences = useUpdateCompanionPreferences();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(open);
  useForegroundHeartbeat(preferences.activityConsent);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;
    if (!wasOpen || open) return;
    const frame = window.requestAnimationFrame(() => buttonRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    const expiresAt = preferences.pausedUntil ? Date.parse(preferences.pausedUntil) : NaN;
    let timer: number;
    function refresh() {
      const current = Date.now();
      setNow(current);
      const remaining = expiresAt - current;
      if (remaining > 0) timer = window.setTimeout(refresh, Math.min(remaining, 2_147_483_647));
    }
    timer = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timer);
  }, [preferences.pausedUntil]);

  const paused =
    preferences.pausedUntil !== null && Date.parse(preferences.pausedUntil) > now;
  const pet = companionPetState(chatState === "idle" && paused ? "quiet" : chatState);
  const petVisual = voiceState === "listening" || voiceState === "requesting" ? "listening" : pet.visual;
  const name = companionDisplayName(preferences);
  const status = pet.label;
  const left = preferences.anchor === "bottom-left";
  const showIntro = !introSeen && !open && !voiceOverlayOpen;

  function dismissIntro() {
    writeIntroSeen(introKey);
    setIntroSeen(true);
  }
  function handleIntroAsk() {
    dismissIntro();
    setOpen(true);
  }
  function handleIntroCustomize() {
    dismissIntro();
    router.push("/settings#companion");
  }
  function handleIntroHide() {
    dismissIntro();
    updatePreferences.mutate({ version: preferences.version, visible: false });
  }
  function handleVoiceStart() {
    onVoiceStart?.();
  }
  function handleChatToggle() {
    if (voiceOverlayOpen) onVoiceDismiss?.();
    toggle();
  }

  return (
    <div
      className={cn(
        "relative hidden md:flex",
        left ? "fixed bottom-0 left-0 z-50 w-auto" : "w-full justify-end",
      )}
    >
      {voiceOverlayOpen ? (
        <div
          role="group"
          aria-label="Companion voice input"
          className={cn(
            "absolute bottom-full mb-2 w-72 rounded-2xl border border-border/80 bg-popover p-3 text-popover-foreground shadow-2xl backdrop-blur-xl",
            left ? "left-2" : "right-2",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-xs font-semibold">
              <span className={cn("size-2 rounded-full bg-primary", voiceState === "listening" && "animate-pulse")} />
              {voiceState === "listening" ? "Listening to you" : voiceState === "requesting" ? "Connecting microphone" : voiceState === "processing" ? "Writing your words" : voiceState === "error" ? "Voice needs attention" : "Ready to review"}
            </span>
            <button type="button" onClick={onVoiceDismiss} aria-label="Dismiss voice input" className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-3.5" aria-hidden /></button>
          </div>
          <p role="status" aria-live="polite" className={cn("mt-2 min-h-8 text-sm leading-snug", voiceState === "error" ? "text-destructive" : "text-foreground")}>
            {voiceCaption ? `“${voiceCaption}”` : voiceMessage ?? "Say what you need help with."}
          </p>
          <p className="mt-1 text-micro leading-snug text-muted-foreground">Audio is sent to OpenAI for transcription and isn&apos;t saved by StreamlineOS.</p>
          <div className="mt-2 flex items-center justify-end gap-2">
            {voiceState === "listening" ? <button type="button" onClick={onVoiceStart} className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Finish speaking</button> : null}
            {voiceState === "error" ? <button type="button" onClick={onVoiceStart} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold">Try again</button> : null}
            {voiceCaption ? <button type="button" onClick={onVoiceReview} className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Review in chat</button> : null}
            {voiceState === "error" ? <button type="button" onClick={onVoiceReview} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold">Type instead</button> : null}
          </div>
        </div>
      ) : showIntro ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-label={`Meet ${name}`}
          className={cn(
            "absolute bottom-full mb-2 w-72 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-panel",
            left ? "left-0" : "right-0",
          )}
        >
          <p className="text-sm font-medium text-foreground">Hi, I&apos;m your StreamlineOS companion.</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ask me about your work, or change how I look and when I speak up.
          </p>
          <div className="mt-2 flex gap-1">
            <Button type="button" size="sm" onClick={handleIntroAsk}>Ask</Button>
            <Button type="button" size="sm" variant="outline" onClick={handleIntroCustomize}>Customize</Button>
            <Button type="button" size="sm" variant="ghost" onClick={handleIntroHide}>Hide</Button>
          </div>
        </div>
      ) : (
        <CompanionPromptBubble enabled={!open && !voiceOverlayOpen} preferences={preferences} />
      )}
      <div className={cn("flex flex-col items-center px-2 pb-2 pt-1", open && "ml-auto")}>
        <button
          ref={buttonRef}
          type="button"
          onClick={handleChatToggle}
          aria-expanded={open}
          aria-label={`${open ? "Minimize" : "Open"} ${name}, ${status}`}
          className="group flex min-h-11 max-w-full flex-col items-center justify-end rounded-2xl text-foreground outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
        <span className="relative flex items-end justify-center" aria-hidden="true">
          <span className="absolute bottom-1 h-3 w-12 rounded-full bg-foreground/10 blur-sm transition-transform group-hover:scale-110" />
          <CompanionCharacter
            preset={preferences.preset}
            state={petVisual}
            animation={preferences.animation}
            className={cn("relative", open ? "size-16" : "size-24")}
          />
        </span>
        </button>
        <span className="relative -mt-1 flex max-w-[10rem] items-center gap-0.5 rounded-full border border-border/80 bg-card/95 p-1 shadow-lg backdrop-blur">
          <button
            type="button"
            onClick={handleChatToggle}
            aria-label={open ? `Minimize ${name}` : `Chat with ${name}`}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MessageCircle className="size-4" aria-hidden />
          </button>
          <span className="min-w-0 px-1 text-center">
          <span className="truncate text-micro font-semibold leading-none">{name}</span>
            <span className="block truncate text-micro leading-none text-muted-foreground">{voiceState === "listening" ? "Listening" : status}</span>
          </span>
          <button
            type="button"
            onClick={handleVoiceStart}
            disabled={voiceState === "processing" || voiceState === "requesting"}
            aria-label={voiceState === "listening" ? "Stop voice input" : `Talk to ${name}`}
            title={voiceSupported ? "Voice input" : "Check voice input availability"}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45"
          >
            {voiceState === "listening" ? <MicOff className="size-4" aria-hidden /> : <Mic className="size-4" aria-hidden />}
          </button>
        </span>
      </div>
      <span role="status" className="sr-only">
        {SILENT.has(pet.visual) ? "" : `${name}: ${status}`}
      </span>
    </div>
  );
}
