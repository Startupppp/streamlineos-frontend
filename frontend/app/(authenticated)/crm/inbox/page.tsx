"use client";

import { useCallback, Suspense } from "react";
import { motion, AnimatePresence, useReducedMotion, type Variants } from "framer-motion";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyInboxIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared";
import { useInbox, useInboxCounts, useSnoozeCrmTask, useCompleteCrmTask } from "@/hooks/api/crm/inbox";
import { getErrorMessage } from "@/lib/get-error-message";
import { InboxStatCards } from "@/features/crm/inbox/inbox-stat-cards";
import { InboxSectionCard } from "@/features/crm/inbox/inbox-section-card";
import { AiActionsSection } from "@/features/crm/inbox/ai-actions-section";

const SECTION_ORDER = [
  "dueTasks",
  "overdueTasks",
  "followUpsDue",
  "newReplies",
  "meetingsToday",
  "slaRisk",
  "stuckDeals",
  "newlyAssigned",
] as const;

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

function InboxSkeleton() {
  return (
    <PageWrapper title="Sales Inbox" subtitle="Your daily command center">
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-[52px] rounded-lg" />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </PageWrapper>
  );
}

function InboxContent() {
  const shouldReduceMotion = useReducedMotion();
  const { data: inboxData, isLoading: inboxLoading, isError: inboxError, refetch } = useInbox();
  const { data: counts, isLoading: countsLoading } = useInboxCounts();
  const snoozeTask = useSnoozeCrmTask();
  const completeTask = useCompleteCrmTask();

  const handleComplete = useCallback(
    (taskId: number) => {
      completeTask.mutate(
        { taskId },
        {
          onSuccess: () => toast.success("Task completed"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [completeTask],
  );

  const handleSnooze = useCallback(
    (taskId: number, until: string) => {
      snoozeTask.mutate(
        { taskId, until },
        {
          onSuccess: () => toast.success("Task snoozed"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [snoozeTask],
  );

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const sections = inboxData?.sections ?? [];
  const aiActions = inboxData?.aiActions ?? [];
  const totalItems = sections.reduce((sum, s) => sum + s.total, 0);
  const isInboxZero = !inboxLoading && !inboxError && totalItems === 0;

  return (
    <PageWrapper title="Sales Inbox" subtitle="Your daily command center">
      <div className="flex flex-1 min-h-0 flex-col space-y-3">
        <InboxStatCards counts={counts} isLoading={countsLoading} />

        {!inboxError && aiActions.length > 0 && (
          <motion.div variants={shouldReduceMotion ? undefined : itemVariants} initial="hidden" animate="visible">
            <AiActionsSection actions={aiActions} />
          </motion.div>
        )}

        {inboxError && (
          <ErrorState
            title="Failed to load inbox"
            description="Could not load your inbox items. Please try again."
            onRetry={handleRetry}
            className="flex-1 min-h-[300px]"
          />
        )}

        {isInboxZero && (
          <EmptyState
            illustration={<EmptyInboxIllustration />}
            title="You're all caught up"
            description="Nothing needs your attention right now."
            className="flex-1 min-h-[400px] border-0 bg-transparent"
          />
        )}

        {!inboxError && !isInboxZero && (
          <AnimatePresence>
            <motion.div
              variants={shouldReduceMotion ? undefined : containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              {SECTION_ORDER.map((key) => {
                const section = sections.find((s) => s.key === key);
                return (
                  <motion.div
                    key={key}
                    variants={shouldReduceMotion ? undefined : itemVariants}
                  >
                    <InboxSectionCard
                      sectionKey={key}
                      items={section?.items ?? []}
                      total={section?.total ?? 0}
                      onComplete={handleComplete}
                      onSnooze={handleSnooze}
                      isSnoozePending={snoozeTask.isPending}
                      isCompletePending={completeTask.isPending}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </PageWrapper>
  );
}

export default function CrmInboxPage() {
  return (
    <Suspense fallback={<InboxSkeleton />}>
      <InboxContent />
    </Suspense>
  );
}
