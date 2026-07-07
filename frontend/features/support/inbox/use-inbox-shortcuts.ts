"use client";

import { useEffect } from "react";
import type { SupportTicket } from "@/types/support";

export const SUPPORT_FOCUS_REPLY_EVENT = "support:focus-reply";

export interface SupportFocusReplyDetail {
  internal: boolean;
}

export const SUPPORT_INSERT_REPLY_DRAFT_EVENT = "support:insert-reply-draft";

export interface SupportInsertReplyDraftDetail {
  body: string;
}

interface UseInboxShortcutsOptions {
  tickets: SupportTicket[];
  selectedTicketId: number | null;
  onSelect: (id: number) => void;
  onCreateNew: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

export function useInboxShortcuts({
  tickets,
  selectedTicketId,
  onSelect,
  onCreateNew,
}: UseInboxShortcutsOptions): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (tickets.length === 0) return;

      const currentIndex = selectedTicketId ? tickets.findIndex((t) => t.id === selectedTicketId) : -1;

      switch (e.key) {
        case "j":
        case "ArrowDown": {
          e.preventDefault();
          const next = tickets[Math.min(currentIndex + 1, tickets.length - 1)] ?? tickets[0];
          onSelect(next.id);
          break;
        }
        case "k":
        case "ArrowUp": {
          e.preventDefault();
          const prev = tickets[Math.max(currentIndex - 1, 0)] ?? tickets[0];
          onSelect(prev.id);
          break;
        }
        case "c": {
          e.preventDefault();
          onCreateNew();
          break;
        }
        case "r": {
          if (!selectedTicketId) return;
          e.preventDefault();
          window.dispatchEvent(
            new CustomEvent<SupportFocusReplyDetail>(SUPPORT_FOCUS_REPLY_EVENT, {
              detail: { internal: false },
            }),
          );
          break;
        }
        case "i": {
          if (!selectedTicketId) return;
          e.preventDefault();
          window.dispatchEvent(
            new CustomEvent<SupportFocusReplyDetail>(SUPPORT_FOCUS_REPLY_EVENT, {
              detail: { internal: true },
            }),
          );
          break;
        }
        default:
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tickets, selectedTicketId, onSelect, onCreateNew]);
}
