"use client";

import { SemanticBadge, type BadgeTone } from "@/components/ui/semantic-badge";

export type ReportingRelationshipKind = "primary" | "secondary" | "fallback" | "topLevel";

const RELATIONSHIP_DISPLAY: Record<ReportingRelationshipKind, { label: string; tone: BadgeTone }> = {
  primary: { label: "Primary", tone: "accent" },
  secondary: { label: "Additional", tone: "neutral" },
  fallback: { label: "Temporarily assigned by onboarding policy", tone: "info" },
  topLevel: { label: "Top-level role", tone: "neutral" },
};

interface ReportingRelationshipBadgeProps {
  kind: ReportingRelationshipKind;
  label?: string | null;
  className?: string;
}

export function ReportingRelationshipBadge({ kind, label, className }: ReportingRelationshipBadgeProps) {
  const display = RELATIONSHIP_DISPLAY[kind];
  const text = kind === "secondary" && label?.trim() ? label.trim() : display.label;
  return <SemanticBadge tone={display.tone} label={text} size="xs" className={className} />;
}
