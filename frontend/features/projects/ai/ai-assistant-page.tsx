"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, ShieldOff } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { useCan } from "@/hooks/api/access";
import { useFeature } from "@/lib/billing/use-feature";
import { SummaryCard } from "./summary-card";
import { RisksCard } from "./risks-card";
import { ClientUpdateCard } from "./client-update-card";
import { PlanCard } from "./plan-card";
import { ExtractTasksCard } from "./extract-tasks-card";
import { AskCard } from "./ask-card";

interface AiAssistantPageProps {
  projectId: number;
}

export function AiAssistantPage({ projectId }: AiAssistantPageProps) {
  const canUseAI = useCan("projects:ai:use");
  const feature = useFeature("ai.project-manager");
  const prefersReducedMotion = useReducedMotion();

  if (!canUseAI) {
    return (
      <PageWrapper title="AI Assistant" eyebrow="Project">
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
      <PageWrapper title="AI Assistant" eyebrow="Project">
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

  const cards = [
    <SummaryCard key="summary" {...sharedProps} />,
    <RisksCard key="risks" {...sharedProps} />,
    <ClientUpdateCard key="client-update" {...sharedProps} />,
    <AskCard key="ask" {...sharedProps} />,
    <PlanCard key="plan" {...sharedProps} />,
    <ExtractTasksCard key="extract" {...sharedProps} />,
  ];

  return (
    <PageWrapper
      title="AI Assistant"
      eyebrow="Project"
      subtitle="Intelligent insights and task generation powered by your project data"
      variant="display"
      badge={<Sparkles className="h-3.5 w-3.5 text-blue-600" />}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.key}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion
                ? undefined
                : { duration: 0.22, ease: "easeOut", delay: i * 0.06 }
            }
          >
            {card}
          </motion.div>
        ))}
      </div>
    </PageWrapper>
  );
}
