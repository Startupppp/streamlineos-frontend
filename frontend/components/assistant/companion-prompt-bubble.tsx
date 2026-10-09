"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useCompanionPromptAction,
  useNextCompanionPrompt,
  useUpdateCompanionPreferences,
} from "@/hooks/api/companion";
import {
  COMPANION_SNOOZE_MINUTES,
  type CompanionPreference,
  type CompanionSnoozeMinutes,
} from "@/hooks/api/companion-schema";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { useOrgStorageScope } from "@/lib/org-scoped-storage";
import { cn } from "@/lib/utils";

interface CompanionPromptBubbleProps {
  enabled: boolean;
  preferences: CompanionPreference;
}

interface PromptBroadcast {
  promptId: string;
  tabId: string;
}

function isPromptBroadcast(value: unknown): value is PromptBroadcast {
  return (
    typeof value === "object" &&
    value !== null &&
    "promptId" in value &&
    typeof value.promptId === "string" &&
    "tabId" in value &&
    typeof value.tabId === "string"
  );
}

function newTabId() {
  return Math.random().toString(36).slice(2);
}

export function CompanionPromptBubble({ enabled, preferences }: CompanionPromptBubbleProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const scope = useOrgStorageScope();
  const next = useNextCompanionPrompt(enabled);
  const claim = useCompanionPromptAction();
  const act = useCompanionPromptAction();
  const updatePreferences = useUpdateCompanionPreferences();
  const [tabId] = useState(newTabId);
  const [showReason, setShowReason] = useState(false);
  const [showSnooze, setShowSnooze] = useState(false);
  const candidate = next.data?.prompt ?? null;
  const candidateId = candidate?.id ?? null;
  const { mutate: claimPrompt, variables: claimVariables } = claim;
  const claimedFor = claimVariables?.promptId ?? null;
  const prompt =
    candidate && claim.isSuccess && claimedFor === candidate.id ? claim.data.prompt : null;

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(`streamline-companion::${scope}`);
    function handleMessage(event: MessageEvent) {
      if (!isPromptBroadcast(event.data) || event.data.tabId === tabId) return;
      const { promptId } = event.data;
      qc.setQueryData<{ prompt: { id: string } | null }>(
        collaborationQueryKeys.companion.nextPrompt(),
        (previous) => (previous?.prompt?.id === promptId ? { prompt: null } : previous),
      );
    }
    channel.addEventListener("message", handleMessage);
    return () => {
      channel.removeEventListener("message", handleMessage);
      channel.close();
    };
  }, [qc, scope, tabId]);

  useEffect(() => {
    if (!enabled || candidateId === null || claimedFor === candidateId) return;
    claimPrompt({ promptId: candidateId, action: "claim" });
  }, [candidateId, claimPrompt, claimedFor, enabled]);

  useEffect(() => {
    if (!prompt || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(`streamline-companion::${scope}`);
    channel.postMessage({ promptId: prompt.id, tabId });
    channel.close();
  }, [prompt, scope, tabId]);

  if (!enabled || !prompt) return null;
  const promptId = prompt.id;
  const href = prompt.href;

  function handleDismiss() {
    act.mutate({ promptId, action: "dismiss" });
  }
  function handleOpen() {
    act.mutate({ promptId, action: "dismiss" });
    if (href) router.push(href);
  }
  function handleToggleReason() {
    setShowReason((previous) => !previous);
  }
  function handleToggleSnooze() {
    setShowSnooze((previous) => !previous);
  }
  function handleSnooze(event: MouseEvent<HTMLButtonElement>) {
    const minutes = COMPANION_SNOOZE_MINUTES.find(
      (value) => String(value) === event.currentTarget.dataset.minutes,
    );
    if (minutes === undefined) return;
    act.mutate({ promptId, action: "snooze", minutes });
  }
  function handleDisableFriendly() {
    updatePreferences.mutate({
      version: preferences.version,
      prompts: { ...preferences.prompts, friendly: false },
    });
    act.mutate({ promptId, action: "dismiss" });
  }

  return (
    <div
      role="region"
      aria-label="Companion suggestion"
      aria-live="polite"
      className={cn(
        "absolute bottom-full mb-2 w-72 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-panel",
        preferences.anchor === "bottom-left" ? "left-0" : "right-0",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{prompt.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{prompt.body}</p>
        </div>
        <button
          type="button"
          aria-label="Dismiss suggestion"
          onClick={handleDismiss}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <XIcon className="size-3.5" aria-hidden />
        </button>
      </div>
      {showReason ? <p className="mt-2 text-xs text-muted-foreground">{prompt.reason}</p> : null}
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {href ? (
          <Button type="button" size="sm" onClick={handleOpen}>
            Open
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="ghost" aria-expanded={showSnooze} onClick={handleToggleSnooze}>
          Snooze
        </Button>
        <Button type="button" size="sm" variant="ghost" aria-expanded={showReason} onClick={handleToggleReason}>
          Why this prompt?
        </Button>
        <Link href="/settings#companion-activity" className="text-xs text-muted-foreground underline-offset-2 hover:underline">
          History
        </Link>
      </div>
      {showSnooze ? (
        <div role="group" aria-label="Snooze for" className="mt-2 flex flex-wrap gap-1">
          {COMPANION_SNOOZE_MINUTES.map((minutes: CompanionSnoozeMinutes) => (
            <Button key={minutes} type="button" size="sm" variant="outline" data-minutes={minutes} onClick={handleSnooze}>
              {minutes} min
            </Button>
          ))}
        </div>
      ) : null}
      {prompt.category === "friendly" ? (
        <Button type="button" size="sm" variant="link" className="mt-1 px-0" onClick={handleDisableFriendly}>
          Turn off check-ins
        </Button>
      ) : null}
    </div>
  );
}
