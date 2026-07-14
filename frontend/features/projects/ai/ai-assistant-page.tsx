"use client";

import { ShieldOff, Sparkles } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { useCan } from "@/hooks/api/access";
import { useFeature } from "@/lib/billing/use-feature";
import { PmPageShell, PmSection } from "@/features/projects/shared/pm-chrome";
import { AskCard } from "./ask-card";
import { AiToolsRail } from "./ai-tools-rail";

interface AiAssistantPageProps {
  projectId: number;
}

const SUBTITLE = "Analyze, plan, and get answers about this project.";

export function AiAssistantPage({ projectId }: AiAssistantPageProps) {
  const canUseAI = useCan("projects:ai:use");
  const feature = useFeature("ai.project-manager");

  if (!canUseAI) {
    return (
      <PageWrapper title="AI Assistant" eyebrow="Project" subtitle={SUBTITLE}>
        <PmPageShell>
          <EmptyState
            illustration={<ShieldOff className="h-10 w-10 text-muted-foreground/40" />}
            title="Access restricted"
            description="You need the projects:ai:use permission to use the AI Assistant."
            className="min-h-[40vh]"
          />
        </PmPageShell>
      </PageWrapper>
    );
  }

  if (!feature.enabled) {
    return (
      <PageWrapper title="AI Assistant" eyebrow="Project" subtitle={SUBTITLE}>
        <PmPageShell>
          <EmptyState
            illustration={<Sparkles className="h-10 w-10 text-primary/40" />}
            title="Upgrade to unlock AI features"
            description={`AI Project Manager is available on the ${feature.requiredPlan ?? "PROFESSIONAL"} plan and above.`}
            action={{ label: "View plans", href: "/billing" }}
            className="min-h-[40vh]"
          />
        </PmPageShell>
      </PageWrapper>
    );
  }

  const sharedProps = {
    projectId,
    featureEnabled: feature.enabled,
    requiredPlan: feature.requiredPlan,
  };

  return (
    <PageWrapper
      title="AI Assistant"
      eyebrow="Project"
      subtitle={SUBTITLE}
      noInternalScroll
      contentClassName="px-0 pb-0"
    >
      <PmPageShell className="h-full gap-0" withGlow={false}>
        <div className="relative flex h-full min-h-0 overflow-hidden">
          <div className="min-w-0 flex-1 overflow-y-auto scrollbar-thin">
            <PmSection index={0} className="space-y-4 px-4 py-4 pb-6 sm:px-6">
              <AskCard {...sharedProps} />
              <div className="md:hidden">
                <AiToolsRail {...sharedProps} variant="stacked" />
              </div>
            </PmSection>
          </div>
          <div className="hidden h-full md:flex">
            <AiToolsRail {...sharedProps} variant="sidebar" />
          </div>
        </div>
      </PmPageShell>
    </PageWrapper>
  );
}
