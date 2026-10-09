"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
    let visibleSince = document.visibilityState === "visible" ? Date.now() : null;
    let accrued = 0;
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        visibleSince = Date.now();
      } else if (visibleSince !== null) {
        accrued += Date.now() - visibleSince;
        visibleSince = null;
      }
    }
    function handleTick() {
      if (document.visibilityState !== "visible" || visibleSince === null) return;
      const now = Date.now();
      const seconds = Math.min(120, Math.round((accrued + now - visibleSince) / 1000));
      accrued = 0;
      visibleSince = now;
      if (seconds > 0) mutate({ sessionId, foregroundSeconds: seconds });
    }
    document.addEventListener("visibilitychange", handleVisibility);
    const timer = window.setInterval(handleTick, HEARTBEAT_MS);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(timer);
    };
  }, [enabled, mutate]);
}

interface CompanionLauncherProps {
  state: AskOsCompanionState;
  preferences: CompanionPreference;
}

export function CompanionLauncher({ state: chatState, preferences }: CompanionLauncherProps) {
  const router = useRouter();
  const { open, setOpen, toggle } = useAskOs();
  const scope = useOrgStorageScope();
  const introKey = orgScopedStorageKey(INTRO_KEY, scope);
  const [introSeen, setIntroSeen] = useState(() => readIntroSeen(introKey));
  const [mountedAt] = useState(Date.now);
  const updatePreferences = useUpdateCompanionPreferences();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(open);
  useForegroundHeartbeat(preferences.activityConsent);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;
    if (!wasOpen || open) return;
    const active = document.activeElement;
    if (active === null || active === document.body) buttonRef.current?.focus();
  }, [open]);

  const paused =
    preferences.pausedUntil !== null && new Date(preferences.pausedUntil).getTime() > mountedAt;
  const pet = companionPetState(chatState === "idle" && paused ? "quiet" : chatState);
  const name = companionDisplayName(preferences);
  const status = pet.label;
  const left = preferences.anchor === "bottom-left";
  const showIntro = !introSeen && !open;

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

  return (
    <div
      className={cn(
        "relative hidden md:flex",
        left ? "fixed bottom-0 left-0 z-50 w-auto" : "w-full justify-end",
      )}
    >
      {showIntro ? (
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
        <CompanionPromptBubble enabled={!open} preferences={preferences} />
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={`${open ? "Minimize" : "Open"} ${name}, ${status}`}
        className={cn(
          "flex h-6 max-w-full items-center gap-1 bg-card px-1.5 text-foreground shadow-lg ring-1 ring-inset ring-border transition-colors hover:bg-muted",
          left ? "rounded-tr-lg" : open ? "w-full" : "rounded-tl-lg",
        )}
      >
        <CompanionCharacter
          preset={preferences.preset}
          state={pet.visual}
          animation={preferences.animation}
          className="size-5"
        />
        <span className="truncate text-micro font-semibold leading-none">{name}</span>
        <span className="truncate text-micro leading-none text-muted-foreground">{status}</span>
      </button>
      <span role="status" className="sr-only">
        {SILENT.has(pet.visual) ? "" : `${name}: ${status}`}
      </span>
    </div>
  );
}
