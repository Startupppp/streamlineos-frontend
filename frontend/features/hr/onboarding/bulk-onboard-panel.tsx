"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Download, RefreshCw, Users, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrgDepartments } from "@/hooks/api/org-hierarchy";
import { useReportingManagerPolicy } from "@/hooks/api/hr/reporting-manager-policy";

import { BULK_ONBOARD_COLUMNS, MAX_ROWS } from "./bulk-onboard-columns";
import { downloadBulkOnboardTemplate } from "./bulk-onboard-download";
import { buildBulkOnboardErrorReportRows } from "./bulk-onboard-error-report";
import { BulkOnboardPreviewTable } from "./bulk-onboard-preview-table";
import { BulkOnboardResultPanel } from "./bulk-onboard-result-panel";
import { BulkOnboardUploadCard } from "./bulk-onboard-upload-card";
import { useBulkOnboardFlow } from "./use-bulk-onboard-flow";

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function BulkOnboardPanel() {
  const { data: orgDepartments } = useOrgDepartments({ limit: 100, status: "ACTIVE" });
  const { data: policy } = useReportingManagerPolicy();
  // Unknown until the policy loads: the server preview checks the cap meanwhile.
  const secondaryCap = policy ? policy.maxSecondaryManagersPerEmployee : null;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const deptNames = useMemo(() => {
    const names = new Set<string>();
    for (const d of orgDepartments?.data ?? []) {
      if (d.name?.trim()) names.add(d.name.trim().toLowerCase());
      if (d.code?.trim()) names.add(d.code.trim().toLowerCase());
    }
    return names;
  }, [orgDepartments?.data]);

  const deptNameList = useMemo(() => {
    const labels = new Set<string>();
    for (const d of orgDepartments?.data ?? []) if (d.name?.trim()) labels.add(d.name.trim());
    return [...labels].sort((a, b) => a.localeCompare(b));
  }, [orgDepartments?.data]);

  const flow = useBulkOnboardFlow(deptNames, secondaryCap);
  const heldBack = flow.rows.length - flow.committableCount;

  async function handleDownloadTemplate() {
    try {
      await downloadBulkOnboardTemplate(deptNameList, policy?.maxSecondaryManagersPerEmployee ?? 0);
      toast.success("Template downloaded");
    } catch {
      toast.error("Could not download template");
    }
  }

  function handleFile(file: File) {
    void flow.handleFile(file);
  }

  function handleOpenConfirm() {
    setConfirmOpen(true);
  }

  function handleConfirm() {
    setConfirmOpen(false);
    flow.commitRows();
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users className="h-4 w-4 text-primary" aria-hidden="true" />
            Bulk onboard employees
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Download the template, fill one row per employee, then upload to create up to {MAX_ROWS} accounts at once.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 gap-1.5" onClick={handleDownloadTemplate}>
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Download template
        </Button>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <p className="mb-2 text-dense font-medium uppercase tracking-wide text-muted-foreground">Required columns</p>
          <div className="flex flex-wrap gap-1.5">
            {BULK_ONBOARD_COLUMNS.filter((c) => c.required).map((c) => (
              <Badge key={c.key} variant="outline" className="h-5 font-mono text-micro font-normal">
                {c.header}
              </Badge>
            ))}
          </div>
          <p className="mt-2 text-dense text-muted-foreground">
            Reporting: primaryManagerEmail (blank = fallback policy), secondaryManagerEmail1–3, topLevelRoleReason,
            effectiveFrom. Optional: phone, gender, role, employeeId, joiningDate, dateOfBirth, taxId, monthlySalary, bank fields.
            {deptNameList.length > 0 ? <> Departments: <span className="text-foreground">{deptNameList.join(", ")}</span></> : null}
          </p>
        </CardContent>
      </Card>

      {flow.step === "upload" ? <BulkOnboardUploadCard parsing={flow.parsing} onFile={handleFile} /> : null}

      {flow.step === "preview" ? (
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <CardTitle className="text-sm">Preview · {flow.fileName}</CardTitle>
                <CardDescription className="mt-0.5 text-xs" aria-live="polite">
                  {flow.checking
                    ? `Checking ${plural(flow.rows.length, "row")} against your organisation…`
                    : `${plural(flow.rows.length, "row")} · ${flow.committableCount} ready to create${heldBack > 0 ? ` · ${heldBack} held back` : ""}`}
                </CardDescription>
              </div>
              <Button type="button" variant="ghost" size="sm" className="h-8 gap-1" onClick={flow.reset}>
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {flow.checkFailed ? (
              <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-status-danger-rule bg-status-danger-surface px-3 py-2 text-xs text-status-danger-ink">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="flex-1">The rows could not be checked, so nothing can be created yet.</span>
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1" onClick={flow.retryPreview}>
                  <RefreshCw className="h-3 w-3" aria-hidden="true" />
                  Check again
                </Button>
              </div>
            ) : heldBack > 0 && !flow.checking ? (
              <div className="flex items-start gap-2 rounded-lg border border-status-warning-rule bg-status-warning-surface px-3 py-2 text-xs text-status-warning-ink">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  Rows marked Error or Skipped will not be created. A row whose manager is another row that fails is
                  skipped with that row named. Warnings are created as shown.
                </span>
              </div>
            ) : null}

            <BulkOnboardPreviewTable rows={flow.rows} />

            <div className="flex flex-col-reverse justify-between gap-2 pt-1 sm:flex-row sm:items-center">
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={flow.reset}>
                Back
              </Button>
              <LoadingButton
                type="button"
                size="sm"
                className="h-8 gap-1.5"
                disabled={flow.committableCount === 0 || flow.checking}
                isPending={flow.committing}
                loadingText="Creating…"
                onClick={handleOpenConfirm}
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Create {plural(flow.committableCount, "employee")}
              </LoadingButton>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Create ${plural(flow.committableCount, "employee")}?`}
        description={`Only rows marked Ready or Warning are created, each with the primary manager shown in the preview.${heldBack > 0 ? ` ${plural(heldBack, "row")} will not be created.` : ""}`}
        confirmLabel={`Create ${plural(flow.committableCount, "employee")}`}
        isPending={flow.committing}
        onConfirm={handleConfirm}
      />

      {flow.step === "done" && flow.commit ? (
        <BulkOnboardResultPanel
          commit={flow.commit}
          report={buildBulkOnboardErrorReportRows(flow.rows, flow.commit)}
          onReset={flow.reset}
        />
      ) : null}
    </div>
  );
}
