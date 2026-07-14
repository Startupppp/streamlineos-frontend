"use client";

import { useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useMyWork } from "@/hooks/api/projects/my-work";
import type { MyWorkItem } from "@/types/projects/my-work";
import { isPast, isToday, parseISO } from "date-fns";
import {
  PmPageShell,
  PmPanel,
  PmSection,
} from "@/features/projects/shared/pm-chrome";
import {
  pmStagger,
  fadeUp,
  fadeUpReduced,
} from "@/features/projects/shared/pm-motion";
import {
  type DueBucket,
  BUCKET_ORDER,
  AllWorkListSkeleton,
  BucketSection,
  CreatedTab,
  SubscribedTab,
  RecentTab,
} from "./my-work-rows";

type WorkTab = "assigned" | "created" | "subscribed" | "recent";

const TAB_CONFIG: Record<WorkTab, { label: string }> = {
  assigned: { label: "Assigned" },
  created: { label: "Created" },
  subscribed: { label: "Subscribed" },
  recent: { label: "Recent" },
};

const WORK_TABS: readonly WorkTab[] = ["assigned", "created", "subscribed", "recent"];

function getDueBucket(item: MyWorkItem): DueBucket {
  if (!item.dueDate) return "none";
  try {
    const d = parseISO(item.dueDate);
    if (isToday(d)) return "today";
    if (isPast(d)) return "overdue";
    return "upcoming";
  } catch {
    return "none";
  }
}

export function MyWorkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldReduceMotion = useReducedMotion();
  const sectionVariants = shouldReduceMotion ? fadeUpReduced : fadeUp;
  const rawTab = searchParams.get("tab");
  const activeTab: WorkTab =
    rawTab === "created" || rawTab === "subscribed" || rawTab === "recent" ? rawTab : "assigned";

  const { data, isLoading, isError, refetch } = useMyWork();

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "assigned") {
        params.delete("tab");
      } else {
        params.set("tab", value);
      }
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  const grouped = useMemo(() => {
    if (!data) return null;
    const buckets: Record<DueBucket, MyWorkItem[]> = {
      overdue: [],
      today: [],
      upcoming: [],
      none: [],
    };
    for (const item of data) {
      buckets[getDueBucket(item)].push(item);
    }
    return buckets;
  }, [data]);

  const totalOpen = useMemo(
    () => data?.filter((i) => i.status !== "DONE" && i.status !== "CANCELLED").length ?? 0,
    [data],
  );

  const bucketCounts = useMemo(() => {
    if (!grouped) return { overdue: 0, today: 0, upcoming: 0 };
    return {
      overdue: grouped.overdue.length,
      today: grouped.today.length,
      upcoming: grouped.upcoming.length,
    };
  }, [grouped]);

  return (
    <PageWrapper
      title="My Work"
      eyebrow="Projects"
      subtitle="Your assigned tickets across all projects"
    >
      <PmPageShell>
        {activeTab === "assigned" && !isLoading && !isError && data && data.length > 0 ? (
          <PmSection index={0}>
            <StatCardGrid cols={4}>
              <motion.div
                variants={sectionVariants}
                transition={pmStagger(0)}
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
              >
                <StatCard
                  label="Open"
                  value={totalOpen}
                  icon={CheckCircle2}
                  tone="default"
                  className="border-border/60 bg-card/50 shadow-sm backdrop-blur-md transition-shadow duration-150 hover:shadow-md supports-[backdrop-filter]:bg-card/40"
                />
              </motion.div>
              <motion.div
                variants={sectionVariants}
                transition={pmStagger(1)}
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
              >
                <StatCard
                  label="Overdue"
                  value={bucketCounts.overdue}
                  icon={AlertCircle}
                  tone={bucketCounts.overdue > 0 ? "red" : "default"}
                  className="border-border/60 bg-card/50 shadow-sm backdrop-blur-md transition-shadow duration-150 hover:shadow-md supports-[backdrop-filter]:bg-card/40"
                />
              </motion.div>
              <motion.div
                variants={sectionVariants}
                transition={pmStagger(2)}
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
              >
                <StatCard
                  label="Due Today"
                  value={bucketCounts.today}
                  icon={CalendarClock}
                  tone="amber"
                  className="border-border/60 bg-card/50 shadow-sm backdrop-blur-md transition-shadow duration-150 hover:shadow-md supports-[backdrop-filter]:bg-card/40"
                />
              </motion.div>
              <motion.div
                variants={sectionVariants}
                transition={pmStagger(3)}
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
              >
                <StatCard
                  label="Upcoming"
                  value={bucketCounts.upcoming}
                  icon={Clock}
                  tone="emerald"
                  className="border-border/60 bg-card/50 shadow-sm backdrop-blur-md transition-shadow duration-150 hover:shadow-md supports-[backdrop-filter]:bg-card/40"
                />
              </motion.div>
            </StatCardGrid>
          </PmSection>
        ) : null}

        <PmSection index={1}>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full gap-3">
            <TabsList className="mb-0 h-8 min-h-8 gap-0.5 rounded-lg p-0.5">
              {WORK_TABS.map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="h-7 px-2.5 text-[12px] sm:px-3 sm:text-[12px]"
                >
                  {TAB_CONFIG[tab].label}
                </TabsTrigger>
              ))}
            </TabsList>

            {activeTab === "assigned" ? (
              isLoading ? (
                <AllWorkListSkeleton />
              ) : isError ? (
                <PmPanel className="flex min-h-[14rem] items-center justify-center p-6">
                  <ErrorState
                    title="Failed to load your work"
                    description="Could not fetch your assigned tickets. Please try again."
                    onRetry={handleRetry}
                  />
                </PmPanel>
              ) : !data || data.length === 0 ? (
                <PmPanel className="flex min-h-[14rem] items-center justify-center p-6">
                  <EmptyState
                    illustrationPreset="projects"
                    title="Nothing assigned to you"
                    description="Tickets assigned to you across all projects will appear here."
                    className="min-h-[12rem]"
                  />
                </PmPanel>
              ) : (
                <div className="flex flex-col gap-3">
                  {BUCKET_ORDER.map((bucket) => {
                    const items = grouped?.[bucket] ?? [];
                    if (items.length === 0) return null;
                    return <BucketSection key={bucket} bucket={bucket} items={items} />;
                  })}
                </div>
              )
            ) : null}

            {activeTab === "created" ? <CreatedTab /> : null}
            {activeTab === "subscribed" ? <SubscribedTab /> : null}
            {activeTab === "recent" ? <RecentTab /> : null}
          </Tabs>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
