"use client";

import React, { useState, useCallback } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
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
import { Badge } from "@/components/ui/badge";
import { Plus, ShieldAlert, Search } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import { useHrCases, useDisciplinaryActions } from "@/hooks/api/hr/cases";
import type { HrCase, CaseCategory, CaseStatus, CaseSeverity } from "@/hooks/api/hr/cases";
import type { DataTableColumn } from "@/components/ui/data-table";
import { CaseStatusBadge, CaseSeverityBadge, CaseCategoryLabel } from "./case-badges";
import { CaseDetailSheet } from "./case-detail-sheet";
import { NewCaseSheet } from "./new-case-sheet";
import { AnonymousReportDialog } from "./anonymous-report-dialog";
import { IssueWarningSheet } from "./issue-warning-sheet";
import { formatDistanceToNow } from "date-fns";

const SENTINEL = "__ALL__";

const STATUS_OPTIONS: { value: CaseStatus | typeof SENTINEL; label: string }[] = [
  { value: SENTINEL, label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "under_investigation", label: "Under Investigation" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "dismissed", label: "Dismissed" },
];

const CATEGORY_OPTIONS: { value: CaseCategory | typeof SENTINEL; label: string }[] = [
  { value: SENTINEL, label: "All Categories" },
  { value: "grievance", label: "Grievance" },
  { value: "disciplinary", label: "Disciplinary" },
  { value: "harassment", label: "Harassment" },
  { value: "ethics", label: "Ethics" },
  { value: "performance", label: "Performance" },
  { value: "workplace_conflict", label: "Workplace Conflict" },
  { value: "policy_violation", label: "Policy Violation" },
  { value: "other", label: "Other" },
];

type ActiveTab = "cases" | "disciplinary";

export function CasesPageContent() {
  const canManage = useCan("hr:cases:manage");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = useState<CaseStatus | "">("");
  const [category, setCategory] = useState<CaseCategory | "">("");
  const [severity, setSeverity] = useState<CaseSeverity | "">("");
  const [page, setPage] = useState(1);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showAnonymous, setShowAnonymous] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("cases");

  const { data: casesData, isLoading: casesLoading } = useHrCases({
    page,
    search: debouncedSearch.trim() || undefined,
    status: status || undefined,
    category: category || undefined,
    severity: severity || undefined,
  });

  const { data: disciplinaryData, isLoading: discLoading } = useDisciplinaryActions({ page });

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const caseColumns: DataTableColumn<HrCase>[] = [
    {
      key: "caseNumber",
      header: "Case #",
      cell: (row) => (
        <span className="font-mono text-xs font-medium text-primary">{row.caseNumber}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (row) => <CaseCategoryLabel category={row.category} />,
    },
    {
      key: "severity",
      header: "Severity",
      cell: (row) => <CaseSeverityBadge severity={row.severity} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <CaseStatusBadge status={row.status} />,
    },
    {
      key: "summary",
      header: "Summary",
      className: "max-w-[280px]",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="truncate text-sm">{row.summary}</span>
          {row.anonymous && (
            <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">Anon</Badge>
          )}
        </div>
      ),
    },
    {
      key: "age",
      header: "Age",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
        </span>
      ),
    },
  ];

  const filters = (
    <div className="flex flex-wrap gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          className="h-8 pl-8 w-48 text-sm"
          placeholder="Search cases..."
          value={search}
          onChange={handleSearchChange}
        />
      </div>
      <Select
        value={status || SENTINEL}
        onValueChange={(v) => { setStatus(v === SENTINEL ? "" : (v as CaseStatus)); setPage(1); }}
      >
        <SelectTrigger className="h-8 w-44 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={category || SENTINEL}
        onValueChange={(v) => { setCategory(v === SENTINEL ? "" : (v as CaseCategory)); setPage(1); }}
      >
        <SelectTrigger className="h-8 w-44 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CATEGORY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <PageWrapper
      title="Employee Relations & Cases"
      subtitle="Manage grievances, investigations, and disciplinary actions"
      filters={filters}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-sm"
            onClick={() => setShowAnonymous(true)}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Anonymous Report
          </Button>
          {canManage && (
            <Button size="sm" className="gap-1.5 h-8 text-sm" onClick={() => setShowNew(true)}>
              <Plus className="h-3.5 w-3.5" />
              New Case
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col flex-1 min-h-0 px-4 sm:px-6 pb-6">
        <div className="flex items-center gap-1 border-b mb-4">
          {(["cases", "disciplinary"] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPage(1); }}
              className={`px-3 py-2 text-xs font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "cases" ? "Cases" : "Disciplinary Actions"}
            </button>
          ))}
        </div>

        {activeTab === "cases" && (
          <DataTable
            columns={caseColumns}
            data={casesData?.data ?? []}
            isLoading={casesLoading}
            getRowKey={(row) => row.id}
            onRowClick={(row) => setSelectedCaseId(row.id)}
            emptyState={<p className="text-sm text-muted-foreground text-center py-8">No cases found</p>}
          />
        )}

        {activeTab === "disciplinary" && (
          <div className="flex flex-col gap-4">
            {canManage && (
              <div className="flex justify-end">
                <Button size="sm" className="gap-1.5 h-8 text-sm" onClick={() => setShowWarning(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Issue Action
                </Button>
              </div>
            )}
            <DataTable
              columns={[
                {
                  key: "employee",
                  header: "Employee ID",
                  cell: (row) => <span className="font-mono text-xs">{row.employeeId}</span>,
                },
                {
                  key: "actionType",
                  header: "Action",
                  cell: (row) => (
                    <span className="text-sm capitalize">{row.actionType.replace(/_/g, " ")}</span>
                  ),
                },
                {
                  key: "effectiveDate",
                  header: "Effective Date",
                  cell: (row) => (
                    <span className="text-xs text-muted-foreground">
                      {new Date(row.effectiveDate).toLocaleDateString()}
                    </span>
                  ),
                },
                {
                  key: "issuedBy",
                  header: "Issued By",
                  cell: (row) => <span className="font-mono text-xs">{row.issuedBy}</span>,
                },
              ]}
              data={disciplinaryData?.data ?? []}
              isLoading={discLoading}
              getRowKey={(row) => row.id}
              emptyState={<p className="text-sm text-muted-foreground text-center py-8">No disciplinary actions</p>}
            />
          </div>
        )}
      </div>

      {selectedCaseId !== null && (
        <CaseDetailSheet
          caseId={selectedCaseId}
          open={selectedCaseId !== null}
          onOpenChange={(v) => { if (!v) setSelectedCaseId(null); }}
        />
      )}

      <NewCaseSheet open={showNew} onOpenChange={setShowNew} />
      <AnonymousReportDialog open={showAnonymous} onOpenChange={setShowAnonymous} />
      <IssueWarningSheet open={showWarning} onOpenChange={setShowWarning} />
    </PageWrapper>
  );
}
