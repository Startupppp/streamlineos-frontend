"use client";

import { useCallback, Suspense } from "react";
import { useCanState } from "@/hooks/api/access";
import { motion, AnimatePresence, useReducedMotion, type Variants } from "framer-motion";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { EmptyInboxIllustration } from "@/components/illustrations";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
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
        <StatCardGridSkeleton cols={4} count={4} className="mb-4" />
        {Array.from({ length: 8 }).map((_, i) => (
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
            className={CONTENT_FILL_PANEL}
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
  /**
   * Ticket 26. The read below disables itself without this permission, and a
   * disabled query in TanStack Query v5 reports `isLoading: false` with no rows
   * -- the same flags an empty result has. Without this guard the branches under
   * it tell somebody their data does not exist, when the truth is that they are
   * not allowed to see it.
   *
   * Checked before the loading branch on purpose: a query that was never allowed
   * to run has no loading state worth waiting for.
   */
  if (useCanState("crm:leads:view") === "denied")
    return <NoPermissionState permission="crm:leads:view" />;

  return (
    <Suspense fallback={<InboxSkeleton />}>
      <InboxContent />
    </Suspense>
  );
}
