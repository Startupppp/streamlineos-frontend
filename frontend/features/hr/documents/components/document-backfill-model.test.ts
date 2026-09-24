import type { DocumentBackfillPage } from "@/hooks/api/hr/document-backfill";
import { BACKFILL_SAMPLE_LIMIT, EMPTY_TOTALS, addPage, documentsWord, skippedLines } from "./document-backfill-model";

function page(overrides: Partial<DocumentBackfillPage> = {}): DocumentBackfillPage {
  return {
    dryRun: true,
    scanned: 0,
    eligible: 0,
    proposals: { allEmployees: 0, hrOnly: 0 },
    skipped: { alreadyClassified: 0, belongsToAnEmployee: 0, typeNotAllowed: 0, hiringArtefact: 0, inactive: 0 },
    applied: 0,
    nextCursor: null,
    done: true,
    sample: [],
    ...overrides,
  };
}

describe("document backfill totals", () => {
  it("adds each page's counts to the running totals, field by field", () => {
    const first = addPage(
      EMPTY_TOTALS,
      page({ scanned: 100, eligible: 30, proposals: { allEmployees: 20, hrOnly: 10 }, skipped: { alreadyClassified: 5, belongsToAnEmployee: 40, typeNotAllowed: 20, hiringArtefact: 3, inactive: 2 }, applied: 30 }),
    );
    const second = addPage(first, page({ scanned: 12, eligible: 4, proposals: { allEmployees: 1, hrOnly: 3 }, skipped: { alreadyClassified: 1, belongsToAnEmployee: 0, typeNotAllowed: 7, hiringArtefact: 0, inactive: 0 }, applied: 4 }));

    expect(second).toMatchObject({
      pages: 2,
      scanned: 112,
      eligible: 34,
      allEmployees: 21,
      hrOnly: 13,
      applied: 34,
      skipped: { alreadyClassified: 6, belongsToAnEmployee: 40, typeNotAllowed: 27, hiringArtefact: 3, inactive: 2 },
    });
  });

  it("does not change the totals it was given", () => {
    const before = addPage(EMPTY_TOTALS, page({ scanned: 3 }));
    addPage(before, page({ scanned: 4 }));

    expect(before.scanned).toBe(3);
    expect(EMPTY_TOTALS.scanned).toBe(0);
  });

  it("keeps the first documents it saw, never more than it lists", () => {
    const many = (start: number) => Array.from({ length: 15 }, (_, index) => ({ documentId: start + index, name: `Policy ${start + index}`, audience: "HR_ONLY" as const }));

    const totals = addPage(addPage(EMPTY_TOTALS, page({ sample: many(1) })), page({ sample: many(100) }));

    expect(totals.sample).toHaveLength(BACKFILL_SAMPLE_LIMIT);
    expect(totals.sample[0]?.documentId).toBe(1);
    expect(totals.sample.at(-1)?.documentId).toBe(104);
  });
});

describe("skippedLines", () => {
  it("says nothing when nothing was left alone", () => {
    expect(skippedLines(EMPTY_TOTALS.skipped)).toEqual([]);
  });

  it("names only the reasons that happened, in the singular for one", () => {
    expect(skippedLines({ alreadyClassified: 1, belongsToAnEmployee: 0, typeNotAllowed: 12, hiringArtefact: 0, inactive: 1 })).toEqual([
      "1 was already classified by HR",
      "12 are a type that is never shared, such as contracts and payslips",
      "1 was removed",
    ]);
  });
});

describe("documentsWord", () => {
  it("counts documents, with the singular for one", () => {
    expect(documentsWord(1)).toBe("1 document");
    expect(documentsWord(0)).toBe("0 documents");
    expect(documentsWord(2)).toBe("2 documents");
  });
});
