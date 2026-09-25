"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useBulkOnboardEmployees, useBulkOnboardPreview } from "@/hooks/api/hr/employee-profile";
import { getErrorMessage } from "@/lib/get-error-message";
import type { BulkOnboardEmployeeRow, BulkOnboardPreviewRow, BulkOnboardResult } from "@/types/hr";
import { MAX_ROWS } from "./bulk-onboard-columns";
import { parseFile } from "./bulk-onboard-parse";
import { validateAndMap, type PreviewRow } from "./bulk-onboard-template";

export type BulkOnboardStep = "upload" | "preview" | "done";

/** One row of the uploaded file, as the client and then the server judged it. */
export interface BulkOnboardFlowRow {
  /** 1-based data row in the file (the header is not counted). */
  fileRow: number;
  preview: PreviewRow;
  payload: BulkOnboardEmployeeRow | null;
  /** The server preview's verdict; null when the row failed the client check or the preview did not run. */
  server: BulkOnboardPreviewRow | null;
  /** The file row that creates this row's manager, when that manager is new in the same file. */
  dependsOnFileRow: number | null;
}

export interface BulkOnboardCommit {
  result: BulkOnboardResult;
  /** `result.results[i].row` is 1-based over the submitted rows; this maps it back to the file. */
  fileRows: number[];
}

const COMMITTABLE = new Set(["READY", "WARNING"]);

export function isCommittable(row: BulkOnboardFlowRow): boolean {
  return row.payload !== null && row.server !== null && COMMITTABLE.has(row.server.status);
}

function checkFile(parsed: Array<Record<string, string>>, deptNames: Set<string>, secondaryCap: number): BulkOnboardFlowRow[] {
  const seenEmails = new Set<string>();
  return parsed.map((raw, i) => {
    const { payload, preview } = validateAndMap(raw, deptNames, secondaryCap);
    if (preview.email && seenEmails.has(preview.email)) {
      preview.errors = [...preview.errors, "Duplicate email in this file"];
      preview.valid = false;
    } else if (preview.email) {
      seenEmails.add(preview.email);
    }
    return { fileRow: i + 1, preview: { ...preview, _idx: i + 1 }, payload: preview.valid ? payload : null, server: null, dependsOnFileRow: null };
  });
}

/** Server rows are numbered 1..n over the submitted payloads; attach each to its file row. */
export function mergeServerPreview(rows: BulkOnboardFlowRow[], serverRows: BulkOnboardPreviewRow[]): BulkOnboardFlowRow[] {
  const submitted = rows.filter((row) => row.payload !== null);
  const fileRowOf = (serverRow: number | null) => (serverRow === null ? null : (submitted[serverRow - 1]?.fileRow ?? null));
  const byFileRow = new Map<number, BulkOnboardPreviewRow>();
  for (const serverRow of serverRows) {
    const fileRow = fileRowOf(serverRow.row);
    if (fileRow !== null) byFileRow.set(fileRow, serverRow);
  }
  return rows.map((row) => {
    const server = byFileRow.get(row.fileRow) ?? null;
    return { ...row, server, dependsOnFileRow: server ? fileRowOf(server.dependsOnRow) : null };
  });
}

export function useBulkOnboardFlow(deptNames: Set<string>, secondaryCap: number) {
  const preview = useBulkOnboardPreview();
  const bulkOnboard = useBulkOnboardEmployees();
  const [step, setStep] = useState<BulkOnboardStep>("upload");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<BulkOnboardFlowRow[]>([]);
  const [commit, setCommit] = useState<BulkOnboardCommit | null>(null);
  const [parsing, setParsing] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);

  async function runServerPreview(checked: BulkOnboardFlowRow[]) {
    const payloads = checked.flatMap((row) => (row.payload ? [row.payload] : []));
    setCheckFailed(false);
    if (payloads.length === 0) return;
    try {
      const response = await preview.mutateAsync(payloads);
      setRows(mergeServerPreview(checked, response.rows));
    } catch (error) {
      setCheckFailed(true);
      toast.error(getErrorMessage(error));
    }
  }

  async function handleFile(file: File) {
    setParsing(true);
    try {
      const parsed = await parseFile(file);
      if (parsed.length === 0) {
        toast.error("No data rows found. Keep the header row and add employees below it.");
        return;
      }
      if (parsed.length > MAX_ROWS) {
        toast.error(`Too many rows (${parsed.length}). Maximum is ${MAX_ROWS} per upload.`);
        return;
      }
      const checked = checkFile(parsed, deptNames, secondaryCap);
      setFileName(file.name);
      setRows(checked);
      setStep("preview");
      await runServerPreview(checked);
    } catch {
      toast.error("Failed to parse file. Use the template (.xlsx) or a CSV with the same headers.");
    } finally {
      setParsing(false);
    }
  }

  function retryPreview() {
    void runServerPreview(rows);
  }

  const committable = rows.filter(isCommittable);

  function commitRows() {
    const toCommit = committable.flatMap((row) => (row.payload ? [{ fileRow: row.fileRow, payload: row.payload }] : []));
    if (toCommit.length === 0) {
      toast.error("No ready rows to create. Fix the errors in the file and re-upload.");
      return;
    }
    bulkOnboard.mutate(
      toCommit.map((row) => row.payload),
      {
        onSuccess: (result) => {
          setCommit({ result, fileRows: toCommit.map((row) => row.fileRow) });
          setStep("done");
          if (result.created > 0 && result.failed === 0 && result.skipped === 0)
            toast.success(`Onboarded ${result.created} employee${result.created === 1 ? "" : "s"}`);
          else if (result.created > 0)
            toast.warning(`Onboarded ${result.created}; ${result.failed} failed, ${result.skipped} skipped`);
          else toast.error("No employees were created. Download the error report for details.");
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function reset() {
    setStep("upload");
    setFileName("");
    setRows([]);
    setCommit(null);
    setCheckFailed(false);
  }

  return {
    step,
    fileName,
    rows,
    commit,
    parsing,
    checking: preview.isPending,
    checkFailed,
    committing: bulkOnboard.isPending,
    committableCount: committable.length,
    handleFile,
    retryPreview,
    commitRows,
    reset,
  };
}
