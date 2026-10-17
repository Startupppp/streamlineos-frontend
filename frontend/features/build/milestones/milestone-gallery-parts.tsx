"use client";

import { useCallback, useState } from "react";
import { Diamond, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { GalleryCase } from "@/features/build/shared/build-list-gallery-cases";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { PmPageShell, PmSection } from "@/components/pm-chrome";
import { MilestoneCard } from "./milestone-card";
import { MILESTONE_STATUS_OPTIONS, STUB_MILESTONES, STUB_NOOP } from "./planning-surfaces-fixtures";

function MilestoneListToolbar() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const handleClearAll = useCallback(() => {
    setSearch("");
    setStatus("all");
    setDateRange({ from: "", to: "" });
  }, []);

  return (
    <BuildListToolbar
      search={{
        value: search,
        onValueChange: setSearch,
        placeholder: "Search milestones…",
        label: "Search milestones",
      }}
      filters={[
        {
          id: "status",
          label: "Status",
          active: status !== "all",
          control: (
            <BuildFilterSelect
              label="Status"
              value={status}
              onValueChange={setStatus}
              options={MILESTONE_STATUS_OPTIONS}
            />
          ),
        },
        {
          id: "date-range",
          label: "Date range",
          active: !!dateRange.from || !!dateRange.to,
          control: (
            <DateRangePicker
              from={dateRange.from || undefined}
              to={dateRange.to || undefined}
              onChange={setDateRange}
              placeholder="Filter by target date…"
            />
          ),
        },
      ]}
      onClearAll={handleClearAll}
    />
  );
}

export function MilestoneGalleryWrapper({
  caseId,
  title,
  children,
}: {
  caseId: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <GalleryCase id={caseId} title={title}>
      <PageWrapper
        title="Milestones"
        subtitle="Key checkpoints and target dates for this project"
        actions={
          <BuildHeaderActions
            actions={[{ id: "new", label: "New Milestone", icon: Diamond, primary: true }]}
          />
        }
        filters={<MilestoneListToolbar />}
      >
        <PmPageShell>
          <PmSection index={0} className="shrink-0">
            <StatCardGrid cols={4}>
              <StatCard label="This page" value={5} icon={Diamond} tone="default" index={0} />
              <StatCard label="Achieved" value={1} icon={CheckCircle2} tone="emerald" index={1} />
              <StatCard label="Pending" value={3} icon={Clock} tone="amber" index={2} />
              <StatCard label="Overdue" value={1} icon={AlertCircle} tone="red" index={3} />
            </StatCardGrid>
          </PmSection>
          <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
            {children}
          </PmSection>
        </PmPageShell>
      </PageWrapper>
    </GalleryCase>
  );
}

export function MilestoneListBody() {
  return (
    <ul className="space-y-2.5 overflow-y-auto p-4" aria-label="Project milestones">
      {STUB_MILESTONES.map((m) => (
        <MilestoneCard key={m.id} milestone={m} onEdit={STUB_NOOP} onDelete={STUB_NOOP} />
      ))}
    </ul>
  );
}
