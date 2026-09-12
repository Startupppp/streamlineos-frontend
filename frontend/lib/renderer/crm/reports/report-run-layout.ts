import type { RecordLayout } from "../../layout";
import type { ReportRunLogEntry } from "@/types/crm/reporting";

/**
 * One report run, as data.
 *
 * The audit read of the reporting module: which questions were asked of the CRM,
 * by whom, and what statement each one executed. It sits behind
 * `crm:reporting:view` rather than `crm:reporting:run` because reviewing what
 * was asked should not require the ability to ask it.
 *
 * Nothing here is an identifier. A run names its report and its runner, and the
 * three cases where there is no name to give are answered in words rather than
 * with a UUID — `reportRunRecordFields` derives all three, so the fallbacks live
 * once beside the fields they fill instead of in a cell.
 *
 * Time is absolute, on the same argument `audit-entry-layout.ts` makes: a run
 * log is read to establish *when* something happened, which "3 hours ago"
 * cannot answer, and it is the column a reader scans down — a phrase of varying
 * length does not line up and a timestamp does.
 *
 * `durationMs` carries its unit in the label rather than in the value. It is a
 * number, and describing it as one is what right-aligns and tabularises it
 * without the screen asking; a cell reading "412ms" would be text that only
 * looks like a figure, and would sort as one.
 *
 * Neither figure carries a `sign`. A row count is a quantity and a duration is
 * never negative, so a sign would tint every row one colour and tell the reader
 * nothing — the same trap `deal-aging-layout.ts` documents.
 */
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
  /*
    A run is the record of something that already happened. There is nothing to
    edit and no endpoint that would accept an edit if there were.
  */
  form: { sections: [] },
};

/**
 * Which report a run was of.
 *
 * Three answers, and the third is why this is not a map lookup at the call site:
 * a definition id with no name in hand means the report has since been deleted,
 * which is a fact about the run worth stating. Falling back to the id would put
 * a UUID in an audit table and answer a different question.
 */
function describeReport(
  run: ReportRunLogEntry,
  names: ReadonlyMap<string, string>,
): string {
  if (run.reportDefinitionId === null) return "Ad-hoc question";
  return names.get(run.reportDefinitionId) ?? "A report that no longer exists";
}

/**
 * Who ran it.
 *
 * A run with no user is a run the application made on somebody's behalf — a
 * schedule, or a background sweep — which is what a null `ranByUserId` means and
 * is more useful than an empty cell. A user id with no name is a member who has
 * since left.
 */
function describeRunner(run: ReportRunLogEntry): string {
  if (run.ranByName) return run.ranByName;
  return run.ranByUserId === null ? "The system" : "A former member";
}

/** One run in the shape the description names, its three fallbacks included. */
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
