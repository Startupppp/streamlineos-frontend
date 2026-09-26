"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BULK_REASSIGNMENT_ROW_CAP,
  type BulkJob,
  type BulkReassignmentRowInput,
} from "@/hooks/api/hr/reporting-line-bulk-jobs-schema";
import { EmployeeSelection, type EmployeeSelectionValue } from "./employee-selection";
import { MappingUpload } from "./mapping-upload";
import { BulkPreviewForm, type BulkSource } from "./bulk-preview-form";
import { BulkCommitPanel } from "./bulk-commit-panel";

type SourceTab = "select" | "upload";

const EMPTY_SELECTION: EmployeeSelectionValue = { employeeUserIds: [], manager: null };

/** The preview is only offered once the chosen source names something to change. */
export function resolveSource(tab: SourceTab, selection: EmployeeSelectionValue, rows: BulkReassignmentRowInput[]): BulkSource | null {
  if (tab === "upload") return rows.length > 0 ? { kind: "rows", rows } : null;
  const count = selection.employeeUserIds.length;
  if (count === 0 || count > BULK_REASSIGNMENT_ROW_CAP || !selection.manager) return null;
  return { kind: "selection", employeeUserIds: selection.employeeUserIds, primaryManagerUserId: selection.manager.userId };
}

/** HR → Employees → Bulk reporting change (PRD §7.6): source → preview → review and commit. */
export function BulkReportingChangeWizard() {
  const [tab, setTab] = useState<SourceTab>("select");
  const [selection, setSelection] = useState<EmployeeSelectionValue>(EMPTY_SELECTION);
  const [rows, setRows] = useState<BulkReassignmentRowInput[]>([]);
  const [job, setJob] = useState<BulkJob | null>(null);

  function handleTabChange(value: string) {
    if (value === "select" || value === "upload") setTab(value);
  }

  function handleStartOver() {
    setJob(null);
    setSelection(EMPTY_SELECTION);
    setRows([]);
  }

  if (job) {
    return (
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">3. Review and commit</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          <BulkCommitPanel job={job} onStartOver={handleStartOver} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">1. Choose who changes</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          <Tabs value={tab} onValueChange={handleTabChange} className="flex flex-col gap-4">
            <TabsList className="w-fit">
              <TabsTrigger value="select">Select employees</TabsTrigger>
              <TabsTrigger value="upload">Upload a mapping file</TabsTrigger>
            </TabsList>
            <TabsContent value="select">
              <EmployeeSelection value={selection} onChange={setSelection} />
            </TabsContent>
            <TabsContent value="upload">
              <MappingUpload rows={rows} onRowsChange={setRows} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">2. Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <BulkPreviewForm source={resolveSource(tab, selection, rows)} onPreviewed={setJob} />
        </CardContent>
      </Card>
    </div>
  );
}
