"use client";

import { SemanticBadge, type BadgeTone } from "@/components/ui/semantic-badge";

export type ReportingRelationshipKind = "primary" | "secondary" | "fallback" | "topLevel";

const RELATIONSHIP_DISPLAY: Record<ReportingRelationshipKind, { label: string; tone: BadgeTone }> = {
  primary: { label: "Primary", tone: "accent" },
  secondary: { label: "Additional", tone: "neutral" },
  // PRD §9: non-alarming — a fallback is a real, working assignment, not a defect.
  fallback: { label: "Temporarily assigned by onboarding policy", tone: "info" },
  topLevel: { label: "Top-level role", tone: "neutral" },
};

interface ReportingRelationshipBadgeProps {
  kind: ReportingRelationshipKind;
  /** Descriptive secondary label ("Functional", "Project"); shown instead of "Additional". */
  label?: string | null;
  className?: string;
}

export function ReportingRelationshipBadge({ kind, label, className }: ReportingRelationshipBadgeProps) {
  const display = RELATIONSHIP_DISPLAY[kind];
  const text = kind === "secondary" && label?.trim() ? label.trim() : display.label;
  return <SemanticBadge tone={display.tone} label={text} size="xs" className={className} />;
}
