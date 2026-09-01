"use client";

import { useState, useCallback } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { PlusIcon } from "@animateicons/react/lucide";
import { StateIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { useCan } from "@/hooks/api/access";
import { useSafetyIncidents, useWellnessPulse } from "@/hooks/api/hr/safety";
import type { SafetyIncident, IncidentStatus, IncidentType, IncidentSeverity } from "@/hooks/api/hr/safety";
import type { DataTableColumn } from "@/components/ui/data-table";
import { IncidentStatusBadge, IncidentSeverityBadge, IncidentTypeLabel } from "./incident-badges";
import { ReportIncidentSheet } from "./report-incident-sheet";
import { WellnessWidget } from "./wellness-widget";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const WellnessTrendChart = dynamic(
  () => import("./wellness-trend-chart").then((m) => ({ default: m.WellnessTrendChart })),
  { ssr: false, loading: () => <Skeleton className="h-[200px]" /> }
);
import { BurnoutFlagsList } from "./burnout-flags-list";
import { formatDistanceToNow } from "date-fns";
import { TruncatedText } from "@/components/ui/truncated-text";

const SENTINEL = "__ALL__";

const STATUS_OPTIONS: { value: IncidentStatus | typeof SENTINEL; label: string }[] = [
  { value: SENTINEL, label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "mitigated", label: "Mitigated" },
  { value: "closed", label: "Closed" },
];

const TYPE_OPTIONS: { value: IncidentType | typeof SENTINEL; label: string }[] = [
  { value: SENTINEL, label: "All Types" },
  { value: "injury", label: "Injury" },
  { value: "accident", label: "Accident" },
  { value: "near_miss", label: "Near Miss" },
  { value: "hazard", label: "Hazard" },
  { value: "environmental", label: "Environmental" },
  { value: "other", label: "Other" },
];

const SEVERITY_OPTIONS: { value: IncidentSeverity | typeof SENTINEL; label: string }[] = [
  { value: SENTINEL, label: "All Severities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

type ActiveTab = "incidents" | "wellness";

function WellnessPulseCard() {
  const { data, isLoading } = useWellnessPulse(true);
  if (isLoading) return <Skeleton className="h-24 w-full rounded-lg" />;
  if (!data) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
      <p className="text-xs font-semibold">7-day wellness pulse</p>
      <p className="text-micro text-muted-foreground leading-snug">{data.honestyNote}</p>
      {data.suppressed ? (
        <p className="text-xs text-muted-foreground">
          Suppressed — fewer than {data.minGroupSize} respondents (k-anonymity).
        </p>
      ) : (
        <div className="flex gap-4 text-xs pt-1">
          <div>
            <p className="text-muted-foreground text-micro">Avg score</p>
            <p className="font-semibold tabular-nums">{data.avgScore ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-micro">Respondents</p>
            <p className="font-semibold tabular-nums">{data.respondents ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-micro">Check-ins</p>
            <p className="font-semibold tabular-nums">{data.checkins ?? "—"}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function SafetyPageContent() {
  const canManage = useCan("hr:safety:manage");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = useState<IncidentStatus | "">("");
  const [type, setType] = useState<IncidentType | "">("");
  const [severity, setSeverity] = useState<IncidentSeverity | "">("");
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("incidents");

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCursors([null]);
    setCursorIndex(0);
  }, []);

  const { data, isLoading, isFetching } = useSafetyIncidents({
    cursor: cursors[cursorIndex] ?? undefined,
    search: debouncedSearch.trim() || undefined,
    status: status || undefined,
    type: type || undefined,
    severity: severity || undefined,
  });

  const columns: DataTableColumn<SafetyIncident>[] = [
    {
      key: "number",
      header: "Incident #",
      cell: (row) => (
        <span className="font-mono text-xs font-medium text-foreground">{row.incidentNumber}</span>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => <IncidentTypeLabel type={row.type} />,
    },
    {
      key: "severity",
      header: "Severity",
      cell: (row) => <IncidentSeverityBadge severity={row.severity} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <IncidentStatusBadge status={row.status} />,
    },
    {
      key: "location",
      header: "Location",
      cell: (row) => <TruncatedText text={row.location ?? ""} className="text-sm max-w-[160px]" />,
    },
    {
      key: "occurredAt",
      header: "When",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(row.occurredAt), { addSuffix: true })}
        </span>
      ),
    },
  ];

  const filters = (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput
        placeholder="Search..."
        value={search}
        onValueChange={handleSearchChange}
        aria-label="Search incidents"
      />
      <Select
        value={status || SENTINEL}
        onValueChange={(v) => { setStatus(v === SENTINEL ? "" : (v as IncidentStatus)); setCursors([null]); setCursorIndex(0); }}
      >
        <SelectTrigger
          aria-label="Filter by status"
          className={cn("w-[9.5rem]", FILTER_SELECT_TRIGGER)}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={type || SENTINEL}
        onValueChange={(v) => { setType(v === SENTINEL ? "" : (v as IncidentType)); setCursors([null]); setCursorIndex(0); }}
      >
        <SelectTrigger
          aria-label="Filter by type"
          className={cn("w-[9rem]", FILTER_SELECT_TRIGGER)}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          {TYPE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={severity || SENTINEL}
        onValueChange={(v) => { setSeverity(v === SENTINEL ? "" : (v as IncidentSeverity)); setCursors([null]); setCursorIndex(0); }}
      >
        <SelectTrigger
          aria-label="Filter by severity"
          className={cn("w-[9rem]", FILTER_SELECT_TRIGGER)}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          {SEVERITY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <PageWrapper
      title="Health, Safety & Wellness"
      subtitle="Track workplace incidents and monitor employee wellbeing"
      filters={activeTab === "incidents" ? filters : undefined}
      actions={
        activeTab === "incidents" ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={14}
            iconClassName="mr-1.5"
            size="sm"
            className="gap-1.5 text-sm"
            onClick={() => setShowReport(true)}
          >
            Report Incident
          </AnimatedIconButton>
        ) : undefined
      }
    >
      <div className="flex min-h-0 flex-1 flex-col pb-6">
        <div className="flex items-center gap-1 border-b mb-4" role="tablist" aria-label="Safety view">
          {(["incidents", "wellness"] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-xs font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "incidents" ? "Incidents" : "Wellness"}
            </button>
          ))}
        </div>

        {activeTab === "incidents" && (
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <DataTable
              className="flex-1 min-h-0"
              columns={columns}
              data={data?.data ?? []}
              isLoading={isLoading}
              getRowKey={(row) => row.id}
              emptyState={
                <EmptyState
                  className="border-0 bg-transparent min-h-[40vh]"
                  illustration={<StateIllustration preset="alert" className="h-28 w-28" />}
                  title="No safety incidents reported"
                  description="Report workplace incidents, accidents, near-misses, and hazards here."
                  action={{ label: "Report Incident", onClick: () => setShowReport(true) }}
                />
              }
            />
            {cursorIndex > 0 || data?.pagination.hasMore ? (
              <CursorPageControls
                page={cursorIndex + 1}
                hasNext={data?.pagination.hasMore ?? false}
                disabled={isFetching}
                onPrevious={() => setCursorIndex((current) => Math.max(0, current - 1))}
                onNext={() => {
                  const nextCursor = data?.pagination.nextCursor;
                  if (!nextCursor) return;
                  setCursors((current) => [
                    ...current.slice(0, cursorIndex + 1),
                    nextCursor,
                  ]);
                  setCursorIndex((current) => current + 1);
                }}
              />
            ) : null}
          </div>
        )}

        {activeTab === "wellness" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <WellnessWidget />
              {canManage && <WellnessPulseCard />}
            </div>
            <div className="space-y-4">
              <WellnessTrendChart />
              {canManage && <BurnoutFlagsList />}
            </div>
          </div>
        )}
      </div>

      <ReportIncidentSheet open={showReport} onOpenChange={setShowReport} />
    </PageWrapper>
  );
}
