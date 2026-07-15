"use client";

import React, { useState, useCallback } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { Plus } from "lucide-react";
import { StateIllustration } from "@/components/illustrations";
import { useCan } from "@/hooks/api/access";
import { useSafetyIncidents } from "@/hooks/api/hr/safety";
import type { SafetyIncident, IncidentStatus, IncidentType, IncidentSeverity } from "@/hooks/api/hr/safety";
import type { DataTableColumn } from "@/components/ui/data-table";
import { IncidentStatusBadge, IncidentSeverityBadge, IncidentTypeLabel } from "./incident-badges";
import { ReportIncidentSheet } from "./report-incident-sheet";
import { WellnessWidget } from "./wellness-widget";
import { WellnessTrendChart } from "./wellness-trend-chart";
import { BurnoutFlagsList } from "./burnout-flags-list";
import { formatDistanceToNow } from "date-fns";

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

type ActiveTab = "incidents" | "wellness";

export function SafetyPageContent() {
  const canManage = useCan("hr:safety:manage");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = useState<IncidentStatus | "">("");
  const [type, setType] = useState<IncidentType | "">("");
  const [severity, setSeverity] = useState<IncidentSeverity | "">("");
  const [page, setPage] = useState(1);
  const [showReport, setShowReport] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("incidents");

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const { data, isLoading } = useSafetyIncidents({
    page,
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
      cell: (row) => <span className="text-sm truncate max-w-[160px]">{row.location}</span>,
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
    <div className="flex flex-wrap gap-2">
      <div className="min-w-0 w-44">
          <SearchInput placeholder="Search..." value={search} onValueChange={handleSearchChange} />
        </div>
      <Select
        value={status || SENTINEL}
        onValueChange={(v) => { setStatus(v === SENTINEL ? "" : (v as IncidentStatus)); setPage(1); }}
      >
        <SelectTrigger className="w-40 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={type || SENTINEL}
        onValueChange={(v) => { setType(v === SENTINEL ? "" : (v as IncidentType)); setPage(1); }}
      >
        <SelectTrigger className="w-36 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map((o) => (
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
          <Button size="sm" className="gap-1.5 text-sm" onClick={() => setShowReport(true)}>
            <Plus className="h-3.5 w-3.5" />
            Report Incident
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col flex-1 min-h-0 px-4 sm:px-6 pb-6">
        <div className="flex items-center gap-1 border-b mb-4">
          {(["incidents", "wellness"] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
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
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            isLoading={isLoading}
            getRowKey={(row) => row.id}
            emptyState={
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <StateIllustration preset="alert" className="h-28 w-28" />
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-foreground">No safety incidents reported</p>
                  <p className="text-xs text-muted-foreground">Report workplace incidents, accidents, near-misses, and hazards here.</p>
                </div>
                <Button size="sm" className="mt-1 gap-1.5 h-8 text-sm" onClick={() => setShowReport(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Report Incident
                </Button>
              </div>
            }
          />
        )}

        {activeTab === "wellness" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <WellnessWidget />
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
