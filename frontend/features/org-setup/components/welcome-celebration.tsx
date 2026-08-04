"use client";

import { PartyPopper, Sparkles, LayoutDashboard } from "lucide-react";
import { CompletionCelebration } from "@/components/celebration/completion-celebration";

type WelcomeCelebrationProps = {
  companyName?: string;
  onContinue: () => void;
  isContinuing?: boolean;
};

const HIGHLIGHTS = [
  { icon: LayoutDashboard, label: "Your dashboard is ready" },
  { icon: Sparkles, label: "Modules and defaults are in place" },
  { icon: PartyPopper, label: "Invite teammates anytime from People" },
];

export function WelcomeCelebration({
  companyName,
  onContinue,
  isContinuing = false,
}: WelcomeCelebrationProps) {
  const displayName = companyName?.trim() || "your organization";

  return (
    <CompletionCelebration
      icon={PartyPopper}
      title={`Welcome to ${displayName}!`}
      description="Your organization is ready. Jump in and start running HR, CRM, projects, and more from one place."
      highlights={HIGHLIGHTS}
      ctaLabel="Open my organization"
      onContinue={onContinue}
      isContinuing={isContinuing}
      footnote="You can invite teammates and finish setup tips anytime."
    />
  );
}
