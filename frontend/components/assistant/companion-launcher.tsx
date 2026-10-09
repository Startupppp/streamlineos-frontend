"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Info, MessageCircle, Mic, MicOff, Minimize2, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useCompanionPlacement } from "./use-companion-placement";
import { COMPANION_VOICES, type CompanionVoiceSettings } from "./companion-voice-settings";

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

function useForegroundHeartbeat(enabled: boolean, scope: string) {
  const { mutate } = useCompanionHeartbeat();
  useEffect(() => {
    if (!enabled) return;
    const sessionKey = orgScopedStorageKey("companion-work-session", scope);
    let sessionId = newSessionId();
    try {
      const existing = window.sessionStorage.getItem(sessionKey);
      if (existing) sessionId = existing;
      else window.sessionStorage.setItem(sessionKey, sessionId);
    } catch { /* Session storage may be unavailable. */ }
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
  }, [enabled, mutate, scope]);
}

interface CompanionLauncherProps {
  state: AskOsCompanionState;
  preferences: CompanionPreference;
  compact?: boolean;
  onVoiceStart?: () => void;
  onVoiceDismiss?: () => void;
  onVoiceReview?: () => void;
  voiceState?: "idle" | "connecting" | "listening" | "thinking" | "working" | "speaking" | "error";
  voiceSupported?: boolean;
  voiceMessage?: string | null;
  voiceOverlayOpen?: boolean;
  voiceSettings?: CompanionVoiceSettings;
  onVoiceSettingsChange?: (settings: CompanionVoiceSettings) => void;
}

export function CompanionLauncher({
  state: chatState,
  preferences,
  compact = false,
  onVoiceStart,
  onVoiceDismiss,
  onVoiceReview,
  voiceState = "idle",
  voiceSupported = false,
  voiceMessage,
  voiceOverlayOpen = false,
  voiceSettings,
  onVoiceSettingsChange,
}: CompanionLauncherProps) {
  const router = useRouter();
  const { open, setOpen, toggle } = useAskOs();
  const scope = useOrgStorageScope();
  const introKey = orgScopedStorageKey(INTRO_KEY, scope);
  const [introSeen, setIntroSeen] = useState(() => readIntroSeen(introKey));
  const [now, setNow] = useState(Date.now);
  const updatePreferences = useUpdateCompanionPreferences();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const minimizedButtonRef = useRef<HTMLButtonElement>(null);
  const dragHintId = useId();
  const {
    rootRef, position, minimized, toggleMinimized,
    onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onKeyDown, consumeDragClick,
  } = useCompanionPlacement(scope, compact);
  const wasOpenRef = useRef(open);
  useForegroundHeartbeat(preferences.activityConsent, scope);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey || event.repeat || event.isComposing) return;
      const target = event.target;
      if (target instanceof HTMLElement && (
        target.matches("input, textarea, select, [role='textbox']") ||
        target.closest("[contenteditable='true'], [role='textbox']")
      )) return;
      if (document.querySelector("[role='dialog'][aria-modal='true'], [role='dialog'][data-state='open'], [role='alertdialog'], [role='listbox']")) return;

      const key = event.key.toLowerCase();
      if (key === "c") {
        event.preventDefault();
        if (minimized) toggleMinimized();
        if (voiceOverlayOpen) onVoiceDismiss?.();
        setOpen(!open);
      } else if (key === "v" && onVoiceStart && voiceState !== "connecting") {
        event.preventDefault();
        if (minimized) toggleMinimized();
        onVoiceStart();
      } else if (key === "m") {
        event.preventDefault();
        if (!minimized && voiceOverlayOpen) onVoiceDismiss?.();
        toggleMinimized();
        window.requestAnimationFrame(() => {
          (minimized ? buttonRef : minimizedButtonRef).current?.focus();
        });
      }
    }
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [minimized, open, onVoiceDismiss, onVoiceStart, setOpen, toggleMinimized, voiceOverlayOpen, voiceState]);

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
  const petVisual = voiceState === "listening" || voiceState === "connecting" ? "listening" : voiceState === "thinking" || voiceState === "working" ? "thinking" : voiceState === "speaking" ? "success" : pet.visual;
  const name = companionDisplayName(preferences);
  const status = pet.label;
  const left = preferences.anchor === "bottom-left";
  const bubbleLeft = position ? position.x < window.innerWidth / 2 : left;
  const bubbleBelow = position !== null && position.y < 230;
  const showIntro = !introSeen && !open && !voiceOverlayOpen && !minimized;

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
    if (consumeDragClick()) return;
    if (voiceOverlayOpen) onVoiceDismiss?.();
    toggle();
  }

  return (
    <div
      ref={rootRef}
      style={position ? { left: position.x, top: position.y, right: "auto", bottom: "auto" } : undefined}
      className={cn(
        "pointer-events-auto fixed bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] z-50 flex w-auto md:bottom-2",
        left ? "left-2" : "right-2",
      )}
    >
      <span id={dragHintId} className="sr-only">Drag to move. Use Alt and arrow keys to reposition.</span>
      {voiceOverlayOpen ? (
        <div
          role="group"
          aria-label="Companion live voice conversation"
          className={cn(
            "absolute w-60 max-w-[calc(100vw-1rem)] rounded-2xl border border-border/80 bg-popover p-3 text-popover-foreground shadow-2xl backdrop-blur-xl",
            bubbleBelow ? "top-full mt-2" : "bottom-full mb-2",
            bubbleLeft ? "left-0" : "right-0",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span role="status" aria-live="polite" className="flex items-center gap-2 text-xs font-semibold">
              <span className={cn("size-2 rounded-full bg-primary", voiceState === "listening" && "animate-pulse")} />
              {voiceState === "listening" ? "Listening to you" : voiceState === "connecting" ? "Connecting…" : voiceState === "thinking" ? "Thinking…" : voiceState === "working" ? "Working on it…" : voiceState === "speaking" ? "Speaking" : voiceState === "error" ? "Voice needs attention" : "Voice is off"}
            </span>
            <span className="flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" aria-label="About live voice" className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Info className="size-4" aria-hidden /></button>
                </PopoverTrigger>
                <PopoverContent align="end" side="top" className="w-64 text-xs leading-relaxed">
                  Microphone audio is sent to OpenAI during a live voice session. Changes to your workspace still require your confirmation.
                </PopoverContent>
              </Popover>
              <button type="button" onClick={onVoiceDismiss} aria-label="Close voice session" className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="size-4" aria-hidden /></button>
            </span>
          </div>
          {voiceState === "error" && voiceMessage ? <p role="alert" className="mt-2 text-xs leading-snug text-destructive">{voiceMessage}</p> : null}
          <div className="mt-2 flex items-center justify-end gap-2">
            {voiceState !== "idle" && voiceState !== "error" ? <button type="button" onClick={onVoiceStart} className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">End conversation</button> : null}
            {voiceState === "error" ? <button type="button" onClick={onVoiceStart} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold">Try again</button> : null}
            <button type="button" onClick={onVoiceReview} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold">Open chat</button>
          </div>
        </div>
      ) : showIntro ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-label={`Meet ${name}`}
          className={cn(
            "absolute w-72 max-w-[calc(100vw-1rem)] rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-panel",
            bubbleBelow ? "top-full mt-2" : "bottom-full mb-2",
            bubbleLeft ? "left-0" : "right-0",
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
        <CompanionPromptBubble enabled={!open && !voiceOverlayOpen && !minimized && !paused} preferences={preferences} horizontal={bubbleLeft ? "left" : "right"} vertical={bubbleBelow ? "below" : "above"} />
      )}
      {minimized ? (
        <button
          ref={minimizedButtonRef}
          type="button"
          aria-label={`Restore ${name}`}
          aria-keyshortcuts="Alt+Shift+M"
          title="Restore pet (Alt+Shift+M)"
          aria-describedby={dragHintId}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onKeyDown={onKeyDown}
          onClick={() => { if (!consumeDragClick()) toggleMinimized(); }}
          className="flex size-11 touch-none items-center justify-center rounded-full border border-border bg-card shadow-lg cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:size-12"
        >
          <CompanionCharacter preset={preferences.preset} state={petVisual} animation={preferences.animation} className="size-7 md:size-8" />
        </button>
      ) : <div className={cn("flex flex-col items-center px-1 pb-1 pt-0.5 md:px-2 md:pb-2 md:pt-1", open && "ml-auto")}>
        <button
          ref={buttonRef}
          type="button"
          onClick={handleChatToggle}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onKeyDown={onKeyDown}
          aria-expanded={open}
          aria-label={`${open ? "Minimize" : "Open"} ${name}, ${status}`}
          aria-describedby={dragHintId}
          className="group flex min-h-11 max-w-full touch-none cursor-grab flex-col items-center justify-end rounded-2xl text-foreground outline-none transition-transform hover:-translate-y-0.5 active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
        <span className="relative flex items-end justify-center" aria-hidden="true">
          <span className="absolute bottom-1 h-3 w-12 rounded-full bg-foreground/10 blur-sm transition-transform group-hover:scale-110" />
          <CompanionCharacter
            preset={preferences.preset}
            state={petVisual}
            animation={preferences.animation}
            className={cn("relative size-12 md:size-24", open && "md:size-16")}
          />
        </span>
        </button>
        <span className="relative -mt-1 flex max-w-[10rem] items-center gap-0.5 rounded-full border border-border/80 bg-card/95 p-0.5 shadow-lg backdrop-blur md:p-1">
          <button type="button" onClick={toggleMinimized} aria-label={`Minimize ${name} pet`} aria-keyshortcuts="Alt+Shift+M" title="Minimize pet (Alt+Shift+M)" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Minimize2 className="size-4" aria-hidden /></button>
          <button
            type="button"
            onClick={handleChatToggle}
            aria-label={open ? `Hide chat with ${name}` : `Chat with ${name}`}
            aria-keyshortcuts="Alt+Shift+C"
            title="Toggle chat (Alt+Shift+C)"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MessageCircle className="size-4" aria-hidden />
          </button>
          {voiceSettings && onVoiceSettingsChange ? <Popover>
            <PopoverTrigger asChild>
              <button type="button" aria-label="Voice settings" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Settings2 className="size-4" aria-hidden /></button>
            </PopoverTrigger>
            <PopoverContent align="end" side="top" className="w-56 space-y-3 text-xs">
              <div className="space-y-1">
                <label htmlFor="companion-voice-choice" className="font-medium">Voice</label>
                <Select value={voiceSettings.voice} disabled={voiceState !== "idle" && voiceState !== "error"} onValueChange={(voice) => onVoiceSettingsChange({ ...voiceSettings, voice: voice as CompanionVoiceSettings["voice"] })}>
                  <SelectTrigger id="companion-voice-choice" size="sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMPANION_VOICES.map((voice) => <SelectItem key={voice} value={voice}>{voice.charAt(0).toUpperCase() + voice.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-muted-foreground">Replies follow the language you speak. Voice changes apply to your next conversation. Voices are AI-generated.</p>
            </PopoverContent>
          </Popover> : null}
          {onVoiceStart ? <button
            type="button"
            onClick={handleVoiceStart}
            disabled={voiceState === "connecting"}
            aria-label={voiceState === "listening" || voiceState === "thinking" || voiceState === "working" || voiceState === "speaking" ? "End voice conversation" : `Talk to ${name}`}
            aria-keyshortcuts="Alt+Shift+V"
            title={voiceSupported ? "Toggle voice (Alt+Shift+V)" : "Check voice availability (Alt+Shift+V)"}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45"
          >
            {voiceState === "listening" || voiceState === "thinking" || voiceState === "working" || voiceState === "speaking" ? <MicOff className="size-4" aria-hidden /> : <Mic className="size-4" aria-hidden />}
          </button> : null}
        </span>
      </div>}
      <span role="status" className="sr-only">
        {SILENT.has(pet.visual) ? "" : `${name}: ${status}`}
      </span>
    </div>
  );
}
