import type { RecordLayout } from "../../layout";
import type { ReportRunLogEntry } from "@/types/crm/reporting";

export const REPORT_RUN_LAYOUT: RecordLayout = {
  key: "crm:report-run",
  singular: "Report run",
  plural: "Report runs",
  titleField: "report",
  fields: [
    { name: "createdAt", label: "When", kind: "dateTime", readOnly: true },
    { name: "report", label: "Report", kind: "text", readOnly: true },
    { name: "sourceKey", label: "Read", kind: "text", readOnly: true },
    { name: "ranBy", label: "Ran by", kind: "text", readOnly: true },
    { name: "rowCount", label: "Rows", kind: "number", readOnly: true },
    { name: "durationMs", label: "Took (ms)", kind: "number", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search report runs…",
    columns: [
      { field: "createdAt", width: "w-44 shrink-0" },
      { field: "report", primary: true },
      { field: "sourceKey", width: "w-40 shrink-0" },
      { field: "ranBy", width: "min-w-[140px]" },
      { field: "rowCount", width: "w-24 shrink-0" },
      { field: "durationMs", width: "w-28 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Run", fields: ["report", "sourceKey", "ranBy", "createdAt"] },
      { title: "Result", fields: ["rowCount", "durationMs"] },
    ],
  },
  form: { sections: [] },
};

function describeReport(
  run: ReportRunLogEntry,
  names: ReadonlyMap<string, string>,
): string {
  if (run.reportDefinitionId === null) return "Ad-hoc question";
  return names.get(run.reportDefinitionId) ?? "A report that no longer exists";
}

function describeRunner(run: ReportRunLogEntry): string {
  if (run.ranByName) return run.ranByName;
  return run.ranByUserId === null ? "The system" : "A former member";
}

export function reportRunRecordFields(
  run: ReportRunLogEntry,
  names: ReadonlyMap<string, string>,
): Record<string, unknown> {
  return {
    reportRunId: run.reportRunId,
    createdAt: run.createdAt,
    report: describeReport(run, names),
    sourceKey: run.sourceKey,
    ranBy: describeRunner(run),
    rowCount: run.rowCount,
    durationMs: run.durationMs,
  };
}
