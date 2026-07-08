"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ShieldOff, Sparkles } from "lucide-react";
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

  const gridItems = [
    { id: "summary", card: <SummaryCard {...sharedProps} /> },
    { id: "risks", card: <RisksCard {...sharedProps} /> },
    { id: "client", card: <ClientUpdateCard {...sharedProps} /> },
    { id: "plan", card: <PlanCard {...sharedProps} /> },
  ];

  return (
    <PageWrapper title="AI Assistant" eyebrow="Project" subtitle={SUBTITLE}>
      <div className="space-y-4 pb-16">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? undefined : { duration: 0.22, ease: "easeOut" }}
        >
          <AskCard {...sharedProps} />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {gridItems.map(({ id, card }, i) => (
            <motion.div
              key={id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                prefersReducedMotion
                  ? undefined
                  : { duration: 0.22, ease: "easeOut", delay: (i + 1) * 0.06 }
              }
              className="h-full"
            >
              {card}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            prefersReducedMotion
              ? undefined
              : { duration: 0.22, ease: "easeOut", delay: 5 * 0.06 }
          }
        >
          <ExtractTasksCard {...sharedProps} />
        </motion.div>
      </div>
    </PageWrapper>
  );
}
