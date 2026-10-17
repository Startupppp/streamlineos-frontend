import type { DocumentBackfillPage } from "@/hooks/api/hr/document-backfill";

/** The most the panel lists by name; the server sends this many per page, the panel keeps the first ones. */
export const BACKFILL_SAMPLE_LIMIT = 20;

export interface BackfillTotals {
  pages: number;
  scanned: number;
  eligible: number;
  allEmployees: number;
  hrOnly: number;
  applied: number;
  skipped: DocumentBackfillPage["skipped"];
  sample: DocumentBackfillPage["sample"];
}

export const EMPTY_TOTALS: BackfillTotals = {
  pages: 0,
  scanned: 0,
  eligible: 0,
  allEmployees: 0,
  hrOnly: 0,
  applied: 0,
  skipped: { alreadyClassified: 0, belongsToAnEmployee: 0, typeNotAllowed: 0, hiringArtefact: 0, inactive: 0 },
  sample: [],
};

/** Folds one page into the running totals; the sample keeps the first documents seen. */
export function addPage(totals: BackfillTotals, page: DocumentBackfillPage): BackfillTotals {
  return {
    pages: totals.pages + 1,
    scanned: totals.scanned + page.scanned,
    eligible: totals.eligible + page.eligible,
    allEmployees: totals.allEmployees + page.proposals.allEmployees,
    hrOnly: totals.hrOnly + page.proposals.hrOnly,
    applied: totals.applied + page.applied,
    skipped: {
      alreadyClassified: totals.skipped.alreadyClassified + page.skipped.alreadyClassified,
      belongsToAnEmployee: totals.skipped.belongsToAnEmployee + page.skipped.belongsToAnEmployee,
      typeNotAllowed: totals.skipped.typeNotAllowed + page.skipped.typeNotAllowed,
      hiringArtefact: totals.skipped.hiringArtefact + page.skipped.hiringArtefact,
      inactive: totals.skipped.inactive + page.skipped.inactive,
    },
    sample: [...totals.sample, ...page.sample].slice(0, BACKFILL_SAMPLE_LIMIT),
  };
}

const SKIP_REASONS: ReadonlyArray<{ key: keyof BackfillTotals["skipped"]; one: string; many: string }> = [
  { key: "alreadyClassified", one: "was already classified by HR", many: "were already classified by HR" },
  { key: "typeNotAllowed", one: "is a type that is never shared, such as a contract or a payslip", many: "are a type that is never shared, such as contracts and payslips" },
  { key: "belongsToAnEmployee", one: "belongs to an employee", many: "belong to employees" },
  { key: "hiringArtefact", one: "came from hiring", many: "came from hiring" },
  { key: "inactive", one: "was removed", many: "were removed" },
];

/** The reasons documents were left alone, worded for a count, and only the ones that happened. */
export function skippedLines(skipped: BackfillTotals["skipped"]): string[] {
  return SKIP_REASONS.filter((reason) => skipped[reason.key] > 0).map(
    (reason) => `${skipped[reason.key]} ${skipped[reason.key] === 1 ? reason.one : reason.many}`,
  );
}

export function documentsWord(count: number): string {
  return count === 1 ? "1 document" : `${count} documents`;
}

export const AUDIENCE_LABEL = { ALL_EMPLOYEES: "Internal, all employees", HR_ONLY: "Internal, HR only" } as const;
