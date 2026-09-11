"use client";

import { useCallback, Suspense } from "react";
import { useCanState } from "@/hooks/api/access";
import dynamic from "next/dynamic";
import { motion, AnimatePresence, useReducedMotion, type Variants } from "framer-motion";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { EmptyInboxIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { useInbox, useInboxCounts, useSnoozeCrmTask, useCompleteCrmTask } from "@/hooks/api/crm/inbox";
import { getErrorMessage } from "@/lib/get-error-message";
import { InboxStatCards } from "@/features/crm/inbox/inbox-stat-cards";
import { AiActionsSection } from "@/features/crm/inbox/ai-actions-section";

const InboxSectionCard = dynamic(
  () =>
    import("@/features/crm/inbox/inbox-section-card").then((m) => ({
      default: m.InboxSectionCard,
    })),
  { ssr: false },
);

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

function InboxSectionCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex h-8 items-center gap-2.5 px-3">
        <Skeleton className="h-3.5 w-3.5 shrink-0 rounded-sm" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="border-t border-border/50">
        <div className="flex h-10 items-center px-3">
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

function InboxSectionListSkeleton() {
  return (
    <div className="space-y-2" role="status" aria-label="Loading inbox">
      {SECTION_ORDER.map((key) => (
        <InboxSectionCardSkeleton key={key} />
      ))}
    </div>
  );
}

function InboxSkeleton() {
  return (
    <PageWrapper title="Sales Inbox" subtitle="Your daily command center">
      <div className="flex flex-1 min-h-0 flex-col space-y-3">
        <StatCardGridSkeleton cols={4} count={4} />
        <InboxSectionListSkeleton />
      </div>
    </PageWrapper>
  );
}

function InboxContent() {
  const shouldReduceMotion = useReducedMotion();
  const { data: inboxData, isLoading: inboxLoading, isError: inboxError, refetch, access: inboxAccess } = useInbox();
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

        {inboxLoading && <InboxSectionListSkeleton />}

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
            access={inboxAccess}
            illustration={<EmptyInboxIllustration />}
            title="You're all caught up"
            description="Nothing needs your attention right now."
            className={CONTENT_FILL_PANEL}
          />
        )}

        {!inboxLoading && !inboxError && !isInboxZero && (
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
