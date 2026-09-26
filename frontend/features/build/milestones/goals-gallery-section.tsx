"use client";

import { useCallback, useState } from "react";
import { Target, TrendingUp, AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared";
import { PM_FILL_PANEL, PmPageShell, PmSection } from "@/components/pm-chrome";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { GoalCard } from "@/features/build/goals/goals-list-shared";
import { GoalDetailSkeleton } from "@/features/build/goals/goal-detail-skeleton";
import { KeyResultRow } from "@/features/build/goals/key-result-row";
import type { GoalListItem, KeyResult } from "@/hooks/api/goals";

const NOOP = () => undefined;

export function GalleryCase({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section data-case={id} aria-label={title}>
      <h2 className="mb-1 text-sm font-semibold text-foreground">{title}</h2>
      <div data-case-frame={id} className="flex h-[34rem] w-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background">
        {children}
      </div>
    </section>
  );
}

const STUB_GOALS: GoalListItem[] = [
  { id: 10, orgId: "org-1", title: "Grow ARR to $5M", description: "Annual recurring revenue target", level: "company", status: "on_track", progress: 65, dueDate: "2027-12-31", startDate: "2027-01-01", owner: { id: "u1", name: "Alice Chen", email: "alice@example.com", image: null }, keyResultCount: 3, parentGoalId: null, projectId: null, ownerMembershipId: 1, createdByMembershipId: 1, createdAt: "2027-01-01T00:00:00Z", updatedAt: "2027-09-01T00:00:00Z", deletedAt: null },
  { id: 11, orgId: "org-1", title: "Launch EU region", description: null, level: "company", status: "at_risk", progress: 30, dueDate: "2027-09-30", startDate: "2027-03-01", owner: { id: "u2", name: "Ben Sharma", email: "ben@example.com", image: null }, keyResultCount: 2, parentGoalId: null, projectId: null, ownerMembershipId: 2, createdByMembershipId: 1, createdAt: "2027-02-01T00:00:00Z", updatedAt: "2027-09-10T00:00:00Z", deletedAt: null },
  { id: 12, orgId: "org-1", title: "Improve NPS to 60", description: null, level: "team", status: "on_track", progress: 50, dueDate: "2027-11-30", startDate: "2027-01-01", owner: null, keyResultCount: 1, parentGoalId: 10, projectId: null, ownerMembershipId: null, createdByMembershipId: 2, createdAt: "2027-01-15T00:00:00Z", updatedAt: "2027-08-20T00:00:00Z", deletedAt: null },
];

const STUB_KEY_RESULTS: KeyResult[] = [
  { id: 1, orgId: "org-1", goalId: 10, title: "Reach $5M ARR by Q4 2027", metricType: "currency", startValue: "3000000", targetValue: "5000000", currentValue: "3850000", unit: "USD", status: "on_track", createdAt: "2027-01-01T00:00:00Z", updatedAt: "2027-09-01T00:00:00Z" },
  { id: 2, orgId: "org-1", goalId: 10, title: "Onboard 20 enterprise accounts", metricType: "number", startValue: "5", targetValue: "20", currentValue: "12", unit: null, status: "on_track", createdAt: "2027-01-01T00:00:00Z", updatedAt: "2027-09-01T00:00:00Z" },
];

function GoalsToolbarGallery() {
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");
  const [status, setStatus] = useState("all");
  const handleClearAll = useCallback(() => { setSearch(""); setLevel("all"); setStatus("all"); }, []);
  return (
    <BuildListToolbar
      search={{ value: search, onValueChange: setSearch, placeholder: "Search goals…", label: "Search goals" }}
      filters={[
        { id: "level", label: "Level", active: level !== "all", control: <BuildFilterSelect label="Level" value={level} onValueChange={setLevel} options={[{ value: "all", label: "All levels" }, { value: "company", label: "Company" }, { value: "team", label: "Team" }, { value: "individual", label: "Individual" }]} /> },
        { id: "status", label: "Status", active: status !== "all", control: <BuildFilterSelect label="Status" value={status} onValueChange={setStatus} options={[{ value: "all", label: "All statuses" }, { value: "on_track", label: "On track" }, { value: "at_risk", label: "At risk" }, { value: "off_track", label: "Off track" }, { value: "completed", label: "Completed" }]} /> },
      ]}
      onClearAll={handleClearAll}
    />
  );
}

function GoalsGalleryWrapper({ caseId, title, children }: { caseId: string; title: string; children: React.ReactNode }) {
  return (
    <GalleryCase id={caseId} title={title}>
      <PageWrapper title="Goals & OKRs" subtitle="Track company, team and individual objectives" actions={<BuildHeaderActions actions={[{ id: "new", label: "New Goal", icon: Target, primary: true }]} />} filters={<GoalsToolbarGallery />}>
        <PmPageShell>
          <PmSection index={0} className="shrink-0">
            <StatCardGrid>
              <StatCard label="Total Goals" value={3} icon={Target} tone="default" index={0} />
              <StatCard label="On Track" value={2} icon={TrendingUp} tone="emerald" index={1} />
              <StatCard label="At Risk" value={1} icon={AlertTriangle} tone="amber" index={2} />
              <StatCard label="Avg Progress" value="48%" icon={TrendingUp} tone="default" index={3} />
            </StatCardGrid>
          </PmSection>
          <PmSection index={1} className="flex min-h-0 flex-1 flex-col">{children}</PmSection>
        </PmPageShell>
      </PageWrapper>
    </GalleryCase>
  );
}

export function GoalsGalleryCases() {
  return (
    <>
      <GoalsGalleryWrapper caseId="goals-ready" title="Goals — populated">
        <div className="flex flex-col gap-3 overflow-y-auto p-4">
          {STUB_GOALS.map((g) => <GoalCard key={g.id} goal={g} onEdit={NOOP} onDelete={NOOP} />)}
        </div>
      </GoalsGalleryWrapper>

      <GoalsGalleryWrapper caseId="goals-loading" title="Goals — loading">
        <div className="space-y-6 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3 rounded-xl border border-border bg-card p-4">
                <div className="skeleton-shimmer animate-pulse h-4 w-3/4 rounded-md bg-muted" />
                <div className="skeleton-shimmer animate-pulse h-2 w-full rounded-full bg-muted" />
                <div className="skeleton-shimmer animate-pulse h-3 w-1/2 rounded-md bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </GoalsGalleryWrapper>

      <GoalsGalleryWrapper caseId="goals-empty-true" title="Goals — true empty">
        <EmptyState className={PM_FILL_PANEL} illustrationPreset="projects" title="No goals yet" description="Create your first objective with measurable key results." action={{ label: "New Goal", onClick: NOOP }} />
      </GoalsGalleryWrapper>

      <GoalsGalleryWrapper caseId="goals-empty-filtered" title="Goals — filtered empty">
        <EmptyState className={PM_FILL_PANEL} illustrationPreset="projects" title="No goals yet" filtersActive onClearFilters={NOOP} />
      </GoalsGalleryWrapper>

      <GoalsGalleryWrapper caseId="goals-error" title="Goals — error">
        <ErrorState className="flex-1" title="Couldn't load goals" description="An unexpected error occurred. Try again." />
      </GoalsGalleryWrapper>

      <GalleryCase id="goals-denied" title="Goals — access denied">
        <NoPermissionState permission="build:goals:view" />
      </GalleryCase>

      <GalleryCase id="goal-detail-skeleton" title="Goal detail — loading">
        <GoalDetailSkeleton />
      </GalleryCase>

      <GalleryCase id="goal-detail-ready" title="Goal detail — populated">
        <PageWrapper title="Grow ARR to $5M" subtitle="Company goal · On track · 65% progress">
          <PmPageShell>
            <PmSection index={0} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
              <h2 className="text-sm font-semibold">Key Results</h2>
              <ul className="flex flex-col gap-2" aria-label="Key results">
                {STUB_KEY_RESULTS.map((kr) => (
                  <li key={kr.id}><KeyResultRow keyResult={kr} onCheckIn={NOOP} canManage /></li>
                ))}
              </ul>
            </PmSection>
          </PmPageShell>
        </PageWrapper>
      </GalleryCase>
    </>
  );
}
