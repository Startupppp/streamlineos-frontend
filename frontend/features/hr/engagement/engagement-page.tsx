"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Heart,
  TrendingUp,
  Star,
  Smile,
  BarChart3,
  Users,
  Megaphone,
  Trophy,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { FilterPill, FilterPillGroup } from "@/components/ui/filter-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

const recognitionListContract = lazyContract(() =>
  import("@/features/hr/engagement/engagement-schema").then((m) => m.recognitionListContract),
);
const recognitionRowContract = lazyContract(() =>
  import("@/features/hr/engagement/engagement-schema").then((m) => m.recognitionContract),
);
import { getErrorMessage } from "@/lib/get-error-message";
import { ErrorState } from "@/components/shared/error-state";
import { AnonymitySuppressedNotice } from "@/components/shared/anonymity-suppressed-notice";
import { PageState } from "@/components/shared/page-state";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useMotionVariants } from "@/lib/motion-variants";
import { useEngagementOverview, useMyMoodHistory, useOrgMoodAggregate } from "@/hooks/api/hr/engagement";
import { useOrgMembers } from "@/hooks/api/organization";
import {
  getUserDisplayName,
  getUserInitials,
  type NamedUser,
} from "@/lib/person-display";
import { TruncatedText } from "@/components/ui/truncated-text";
import { MoodCheckinWidget } from "@/features/hr/engagement/mood-checkin-widget";
import { MOODS } from "@/features/hr/engagement/mood-scale";
import {
  RecognitionFeed,
  BadgesGrid,
  PointsLeaderboard,
  GiveKudosSheet,
} from "@/features/hr/engagement/recognition-feed";
import { PollsTab } from "@/features/hr/engagement/polls-tab";
import { CommunitiesTab } from "@/features/hr/engagement/communities-tab";
import { CampaignsTab } from "@/features/hr/engagement/campaigns-tab";

type Tab = "overview" | "recognition" | "mood" | "polls" | "communities" | "campaigns";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { id: "recognition", label: "Recognition", icon: <Heart className="h-3.5 w-3.5" /> },
  { id: "mood", label: "Mood", icon: <Smile className="h-3.5 w-3.5" /> },
  { id: "polls", label: "Polls", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { id: "communities", label: "Communities", icon: <Users className="h-3.5 w-3.5" /> },
  { id: "campaigns", label: "Campaigns", icon: <Megaphone className="h-3.5 w-3.5" /> },
];

interface Recognition {
  id: number;
  fromUserId: string;
  toUserId: string;
  message: string;
  category: string;
  createdAt: string;
  fromUser?: { name: string | null; email: string | null };
  toUser?: { name: string | null; email: string | null };
}

function useRecognitions() {
  const canView = useCan("hr:engagement:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.hrRecognition,
    queryFn: ({ signal }) => apiClient.get("/hr/recognition", undefined, signal, recognitionListContract),
    staleTime: 60_000,
    enabled: canView && hrEnabled,
  });
}

function useCreateRecognition() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:engagement:view", {
    mutationKey: ["hr", "recognition", "create"],
    mutationFn: (data: { toUserId: string; message: string; category: string }) =>
      apiClient.post("/hr/recognition", data, undefined, recognitionRowContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hrRecognition }),
  });
}

function MoodIcon({ mood }: { mood: number }) {
  const entry = MOODS.find((m) => m.value === mood);
  if (!entry) return null;
  const Icon = entry.icon;
  return <Icon className="h-5 w-5 shrink-0 text-foreground" aria-label={entry.label} role="img" />;
}

function MoodSparkline({ data }: { data: { date: string; avgMood: number }[] }) {
  if (data.length === 0) return null;
  const last14 = data.slice(-14);
  const max = 5;
  const h = 40;

  return (
    <svg viewBox={`0 0 ${last14.length * 12} ${h}`} className="w-full h-10" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={last14
          .map((d, i) => `${i * 12 + 6},${h - (d.avgMood / max) * (h - 6) + 3}`)
          .join(" ")}
      />
    </svg>
  );
}

function OverviewTab() {
  const { staggerContainer, fadeUp } = useMotionVariants();
  const { data: overview, isLoading, isError, error, refetch } = useEngagementOverview();
  const { data: moodData, isLoading: moodLoading, isError: moodError, error: moodErrorData, refetch: refetchMood } = useOrgMoodAggregate();
  const { data: recognitions, isLoading: recLoading, isError: recError } = useRecognitions();
  const { data: membersData } = useOrgMembers(1, 200);
  const canManage = useCan("hr:engagement:manage");

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, { name: member.name, email: member.email });
    }
    return map;
  }, [membersData]);

  const moodPoints = moodData?.points ?? [];
  const recentMoodPoints = moodPoints.slice(-7);
  const recentCount = recognitions?.length ?? 0;
  const eom = overview?.employeeOfMonth?.top;
  const eomMember = eom ? memberById.get(eom.userId) : undefined;
  const eomName = eomMember ? getUserDisplayName(eomMember) : eom ? "Unknown" : null;
  const eomInitials = eomMember ? getUserInitials(eomMember) : eom ? "?" : null;

  function handleRetry(): void {
    void refetch();
  }

  function handleRetryMood(): void {
    void refetchMood();
  }

  if (isError)
    return <ErrorState title="Couldn't load engagement data" description={getErrorMessage(error)} onRetry={handleRetry} />;

  return (
    <div className="space-y-4">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        <motion.div variants={fadeUp}>
          <StatCardGrid cols={4}>
            <StatCard
              label="Recognitions"
              value={recError ? "—" : recentCount}
              hint={recError ? "Couldn't load" : "All time"}
              icon={Heart}
              tone="red"
              isLoading={recLoading}
            />
            <StatCard
              label="Top Points"
              value={overview?.topLeaderboard?.[0]?.total ?? "—"}
              hint="This period"
              icon={Trophy}
              tone="amber"
              isLoading={isLoading}
            />
            <StatCard
              label="Mood responses"
              value={moodData ? moodPoints.reduce((acc, d) => acc + d.count, 0) : "—"}
              hint={moodError ? "Couldn't load" : "Aggregated"}
              icon={Smile}
              tone="blue"
              isLoading={moodLoading}
            />
            <StatCard
              label="Avg mood"
              value={
                recentMoodPoints.length > 0
                  ? (recentMoodPoints.reduce((s, d) => s + d.avgMood, 0) / recentMoodPoints.length).toFixed(1)
                  : "—"
              }
              hint={moodError ? "Couldn't load" : "Last 7 days"}
              icon={Star}
              tone="blue"
              isLoading={moodLoading}
            />
          </StatCardGrid>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {canManage && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">Mood trend (14 days)</p>
            {moodLoading || (!moodData && !moodError) ? (
              <Skeleton className="h-10 w-full" />
            ) : moodError || !moodData ? (
              <ErrorState compact title="Couldn't load the mood trend" description={getErrorMessage(moodErrorData)} onRetry={handleRetryMood} />
            ) : moodPoints.length > 0 ? (
              <MoodSparkline data={moodPoints} />
            ) : moodData.suppressedDays > 0 ? (
              <AnonymitySuppressedNotice minResponses={moodData.minResponses} />
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">No mood check-ins yet</p>
            )}
            {moodData && moodPoints.length > 0 ? (
              <p className="text-dense text-muted-foreground">
                Aggregated — days with fewer than {moodData.minResponses} responses are hidden to protect anonymity
                {moodData.suppressedDays > 0 ? ` (${moodData.suppressedDays} hidden)` : ""}
              </p>
            ) : null}
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Employee of the Month</p>
            <Badge variant="secondary" className="text-micro">
              {overview?.employeeOfMonth?.period ?? "—"}
            </Badge>
          </div>
          {isLoading ? (
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ) : eom && eomName ? (
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-status-warning-surface flex items-center justify-center text-status-warning-ink font-bold text-lg">
                {eomInitials}
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{eomName}</p>
                <p className="text-dense text-muted-foreground">
                  {eom.recognitions} kudos · {eom.points} pts
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">No data for this period</p>
          )}
        </div>
      </div>
    </div>
  );
}

function RecognitionTab() {
  const {
    data: recognitions,
    isLoading: recLoading,
    isError: recError,
    error: recErrorData,
    refetch: refetchRec,
  } = useRecognitions();
  const createRecognition = useCreateRecognition();
  // POST /hr/recognition is `hr:engagement:view` (engagement.controller.ts:127).
  const canGiveKudos = useCan("hr:engagement:view");
  const [kudosOpen, setKudosOpen] = useState(false);

  function handleGiveKudos(): void {
    setKudosOpen(true);
  }

  function handleKudosSubmit(data: { toUserId: string; message: string; category: string }): void {
    toast.promise(createRecognition.mutateAsync(data), {
      loading: "Sending kudos...",
      success: () => {
        setKudosOpen(false);
        return "Kudos sent!";
      },
      error: getErrorMessage,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Kudos Feed</p>
        {canGiveKudos && (
          <Button size="sm" className="gap-1.5" onClick={handleGiveKudos}>
            <Heart className="h-3.5 w-3.5" />
            Give Kudos
          </Button>
        )}
      </div>

      <RecognitionFeed
        recognitions={recognitions ?? []}
        isLoading={recLoading}
        isError={recError}
        error={recErrorData}
        onRetry={() => void refetchRec()}
        onGiveKudos={canGiveKudos ? handleGiveKudos : undefined}
      />

      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Badges</p>
        <BadgesGrid />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Leaderboard</p>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <PointsLeaderboard />
        </div>
      </div>

      <GiveKudosSheet
        open={kudosOpen}
        onOpenChange={setKudosOpen}
        onSubmit={handleKudosSubmit}
        isPending={createRecognition.isPending}
      />
    </div>
  );
}

function MoodTab() {
  const { data: history, isLoading, isError, error, refetch } = useMyMoodHistory();

  function handleRetry(): void {
    void refetch();
  }

  return (
    <div className="space-y-4">
      <MoodCheckinWidget />

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">My Mood History</p>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-9 rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState compact title="Couldn't load mood history" description={getErrorMessage(error)} onRetry={handleRetry} />
        ) : !history || history.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No mood check-ins yet</p>
        ) : (
          <div className="space-y-1">
            {history.slice(0, 14).map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-muted/50">
                <MoodIcon mood={entry.mood} />
                <span className="text-xs text-muted-foreground w-24 shrink-0">{entry.date}</span>
                {entry.note && <TruncatedText text={entry.note} className="text-xs text-foreground" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface EngagementTabPillProps {
  tab: { id: Tab; label: string; icon: React.ReactNode };
  activeTab: Tab;
  onSelect: (id: Tab) => void;
}

function EngagementTabPill({ tab, activeTab, onSelect }: EngagementTabPillProps) {
  function handleClick(): void {
    onSelect(tab.id);
  }

  return (
    <FilterPill active={activeTab === tab.id} onClick={handleClick}>
      {tab.icon}
      {tab.label}
    </FilterPill>
  );
}

export function HrEngagementPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";
  const pageState = usePageState({ permission: "hr:engagement:view", isLoading: false, isError: false });

  const tabContent = useMemo(() => {
    switch (activeTab) {
      case "overview": return <OverviewTab />;
      case "recognition": return <RecognitionTab />;
      case "mood": return <MoodTab />;
      case "polls": return <PollsTab />;
      case "communities": return <CommunitiesTab currentUserId={currentUserId} />;
      case "campaigns": return <CampaignsTab />;
    }
  }, [activeTab, currentUserId]);

  return (
    <PageWrapper
      title="Polls & engagement"
      subtitle="Recognition, mood check-ins, polls, communities, and campaigns"
    >
      <PageState resolution={pageState} loading={null} className="flex-1">
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <FilterPillGroup className="flex-wrap overflow-x-visible">
            {TABS.map((tab) => (
              <EngagementTabPill key={tab.id} tab={tab} activeTab={activeTab} onSelect={setActiveTab} />
            ))}
          </FilterPillGroup>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {tabContent}
            </motion.div>
          </AnimatePresence>
        </div>
      </PageState>
    </PageWrapper>
  );
}
