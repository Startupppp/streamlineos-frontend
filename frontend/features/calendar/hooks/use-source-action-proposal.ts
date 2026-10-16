"use client";

import { useState } from "react";
import type { CalendarListItem } from "@/hooks/api/calendar";
import {
  useCalendarSourceActionProposal,
  useCalendarSourceActionProposals,
} from "@/hooks/api/calendar-source-actions";
import type { CalendarSourceActionProposal } from "@/hooks/api/calendar-source-actions-schema";

export function useSourceActionProposal(event: CalendarListItem, enabled: boolean) {
  const [localProposal, setProposal] = useState<CalendarSourceActionProposal | null>(null);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const proposals = useCalendarSourceActionProposals(enabled);
  const belongs = (item: CalendarSourceActionProposal) => item.steps.some((step) =>
    step.sourceKey === event.sourceKey &&
    step.sourceRecordId === event.sourceRecordId &&
    step.sourceActionId === "reschedule",
  );
  const restored = proposals.data?.find((item) =>
    !dismissedIds.includes(item.id) &&
    ["PROPOSED", "APPLYING", "PARTIAL"].includes(item.status) &&
    belongs(item),
  ) ?? null;
  const selected = localProposal && belongs(localProposal) ? localProposal : restored;
  const detail = useCalendarSourceActionProposal(selected?.id ?? null);
  const proposal = detail.data?.id === selected?.id ? detail.data : selected;

  function dismissProposal() {
    if (!proposal) return;
    setDismissedIds((current) => [...current, proposal.id]);
    setProposal(null);
  }

  return { proposal, setProposal, dismissProposal };
}
