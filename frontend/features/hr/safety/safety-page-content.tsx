"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { Plus, Search } from "lucide-react";
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
  const [status, setStatus] = useState<IncidentStatus | "">("");
  const [type, setType] = useState<IncidentType | "">("");
  const [severity, setSeverity] = useState<IncidentSeverity | "">("");
  const [page, setPage] = useState(1);
  const [showReport, setShowReport] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("incidents");

  const { data, isLoading } = useSafetyIncidents({
    page,
    search: search || undefined,
    status: status || undefined,
    type: type || undefined,
    severity: severity || undefined,
  });

  const columns: DataTableColumn<SafetyIncident>[] = [
    {
      key: "number",
      header: "Incident #",
      cell: (row) => (
        <span className="font-mono text-xs font-medium text-blue-700">{row.incidentNumber}</span>
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
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          className="h-8 pl-8 w-44 text-sm"
          placeholder="Search..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>
      <Select
        value={status || SENTINEL}
        onValueChange={(v) => { setStatus(v === SENTINEL ? "" : (v as IncidentStatus)); setPage(1); }}
      >
        <SelectTrigger className="h-8 w-40 text-sm">
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
        <SelectTrigger className="h-8 w-36 text-sm">
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
          <Button size="sm" className="gap-1.5 h-8 text-sm" onClick={() => setShowReport(true)}>
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
                  ? "border-blue-600 text-blue-600"
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
            emptyState={<p className="text-sm text-muted-foreground text-center py-8">No safety incidents reported</p>}
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
