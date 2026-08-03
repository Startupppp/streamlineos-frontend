"use client";

import { SemanticBadge } from "@/components/ui/semantic-badge";
import type { BadgeTone } from "@/components/ui/semantic-badge";
import { KIND_LABELS, STATUS_LABELS, type HrTemplateKind, type HrTemplateStatus } from "@/types/hr/templates";

const KIND_TONES: Record<HrTemplateKind, BadgeTone> = {
  onboarding_checklist: "success",
  offboarding_checklist: "orange",
  probation_review: "info",
  performance_review: "info",
  goal: "yellow",
  letter: "neutral",
  document_request: "danger",
  email: "info",
  notification: "info",
  survey: "teal",
  training: "teal",
  asset_assignment: "warning",
  exit_interview: "danger",
};

const STATUS_TONES: Record<HrTemplateStatus, BadgeTone> = {
  draft: "neutral",
  review: "yellow",
  approved: "info",
  active: "success",
  archived: "neutral",
};

export function KindBadge({ kind }: { kind: HrTemplateKind }) {
  return <SemanticBadge tone={KIND_TONES[kind]} label={KIND_LABELS[kind]} size="xs" />;
}

export function StatusBadge({ status }: { status: HrTemplateStatus }) {
  return <SemanticBadge tone={STATUS_TONES[status]} label={STATUS_LABELS[status]} size="xs" />;
}
