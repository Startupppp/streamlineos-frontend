"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ShieldOff, Sparkles } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { useCan } from "@/hooks/api/access";
import { useFeature } from "@/lib/billing/use-feature";
import { AskCard } from "./ask-card";
import { AiToolsRail } from "./ai-tools-rail";

interface AiAssistantPageProps {
  projectId: number;
}

const SUBTITLE = "Analyze, plan, and get answers about this project.";

export function AiAssistantPage({ projectId }: AiAssistantPageProps) {
  const canUseAI = useCan("projects:ai:use");
  const feature = useFeature("ai.project-manager");
  const prefersReducedMotion = useReducedMotion();

  if (!canUseAI) {
    return (
      <PageWrapper title="AI Assistant" eyebrow="Project" subtitle={SUBTITLE}>
        <EmptyState
          illustration={<ShieldOff className="h-10 w-10 text-muted-foreground/40" />}
          title="Access restricted"
          description="You need the projects:ai:use permission to use the AI Assistant."
          className="mt-12"
        />
      </PageWrapper>
    );
  }

  if (!feature.enabled) {
    return (
      <PageWrapper title="AI Assistant" eyebrow="Project" subtitle={SUBTITLE}>
        <EmptyState
          illustration={<Sparkles className="h-10 w-10 text-blue-400/60" />}
          title="Upgrade to unlock AI features"
          description={`AI Project Manager is available on the ${feature.requiredPlan ?? "PROFESSIONAL"} plan and above.`}
          action={{ label: "View plans", href: "/billing" }}
          className="mt-12"
        />
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
      <div className="flex h-full overflow-hidden">
        <div className="flex-1 min-w-0 overflow-y-auto scrollbar-thin">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? undefined : { duration: 0.22, ease: "easeOut" }}
            className="px-4 sm:px-6 py-4 pb-6 space-y-4"
          >
            <AskCard {...sharedProps} />

            <div className="md:hidden">
              <AiToolsRail {...sharedProps} variant="stacked" />
            </div>
          </motion.div>
        </div>

        <div className="hidden md:flex h-full">
          <AiToolsRail {...sharedProps} variant="sidebar" />
        </div>
      </div>
    </PageWrapper>
  );
}
