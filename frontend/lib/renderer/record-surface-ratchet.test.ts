import fs from "node:fs";
import path from "node:path";

const REMAINING_BY_MODULE: Readonly<Record<string, number>> = {
  "careers": 2,
  "hr": 125, // 127 until 2026-09-25, when Recruitment OS (17) left features/hr
  "recruitment": 17,
  "inventory": 138, // 96 on the CRM lane; +40 from the inventory lane on merge
  "build": 88,
  "payroll": 55,
  "employee-support": 2,
  "accounting": 32,
  "settings": 25,
  "timesheets": 23,
  "support": 15,
  "directory": 17,
  "billing": 10,
  "sign": 8,
  "surveys": 6,
  "wiki": 12,
  "notifications": 4,
  "chat": 2,
  "help-centre": 3,
  "landing": 3,
  "crm": 2,
  "employee-onboarding": 2,
  "module-access": 2,
  "portal-access": 3,
  "workflows": 2,
  "auth": 1,
  "calendar": 1,
  "feedbucket": 1,
  "invitation": 1,
  "legal": 1,
  "mail": 1,
  "party": 1,
  "payments": 1,
  "portal": 1,
};

const CRAFTED_BY_DESIGN: Readonly<Record<string, string>> = {
  "features/guided-chain/generate-invoice-sheet.tsx":
    "A multi-step flow, not a record form: step one selects which approved timesheet entries to bill and step two prices the invoice they produce. RecordForm has a single-submit contract and no vocabulary for a selection that determines the next step's fields.",
  "features/crm/quotes/components/quote-create-sheet.tsx":
    "A quote is priced line by line with a `useFieldArray` grid; the renderer has no vocabulary for a repeating priced row that recalculates a total.",
  "features/crm/settings/assignment-rule-sheet.tsx":
    "Rule construction is a condition tree, not a record. The drag-ordered list beside it is the rule's precedence, which is the thing being edited.",
  "features/crm/settings/pipelines/create-pipeline-dialog.tsx":
    "Creating a pipeline creates its stages in the same gesture — a record and its ordered children at once.",
  "features/crm/settings/pipelines/stage-advanced-sheet.tsx":
    "Stage automation is a small workflow editor that happens to live behind a record.",
  "features/crm/settings/blueprints/transition-matrix.tsx":
    "A state-transition matrix. The grid is the data structure, not a presentation of rows.",
  "features/crm/inbox/inbox-section-card.tsx":
    "Heterogeneous items from several record types in one list; the renderer describes one record type at a time.",
  "features/crm/reports/builder/report-result-columns.ts":
    "The columns are built from a compiled report's own projections, so the row type is `Record<string, unknown>` known only at run time. There is no record here to describe.",
  "features/crm/reports/builder/report-builder-panel.tsx":
    "The fields being edited describe a query — source, projections, filters, grouping — not a record, which is the same argument the assignment-rule condition tree makes.",
  "features/build/shared/build-list-gallery-cases.tsx":
    "Fixture rows and columns for the dev-only /design-system/build-list gallery, which exists so the Build list contract can be measured in a real browser at 375/768/1280. It renders no record and reaches no endpoint; describing it to the renderer would describe a test double.",
  "features/build/shared/build-list-gallery-data.tsx":
    "Gallery fixture data and column definitions for the same dev-only /design-system/build-list surface as build-list-gallery-cases.tsx. It contains only synthetic rows, static filter state and a renderMobileCard helper; it reaches no endpoint and there is no record to describe to the renderer.",
  "features/settings/privacy/typed-email-confirm-dialog.tsx":
    "A guard on an irreversible erasure, not a record: the operator types the subject's email, it is compared case-insensitively with a value known only at run time and then discarded, and the submit is ConfirmDialog's own confirm button, held disabled until the typed value matches. Nothing is stored, so there is no record to describe, and RecordForm has neither an equals-this-value check nor a way to hand its validity to another component's button.",
  "features/crm/nurture/nurture-step-editor.tsx":
    "A cadence edited and saved whole through `useFieldArray`, because step numbers come from the array's order and a gap makes the sender fire twice. The ordered array is the data structure.",
};

const PATTERN = /DataTableColumn<|<table[ >]|useForm[<(]/;

function executable(source: string): string {
  return source
    .replace(/\r\n/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

function walk(dir: string, found: string[] = []): string[] {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) walk(full, found);
    else if (/\.tsx?$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) found.push(full);
  }
  return found;
}

function moduleOf(file: string): string {
  const parts = file.split(path.sep);
  return parts[0] === "features" ? parts[1]! : parts[2] ?? parts[1]!;
}

function handWrittenSurfaces(): string[] {
  const root = path.join(__dirname, "../..");
  const crafted = new Set(Object.keys(CRAFTED_BY_DESIGN).map((file) => file.split("/").join(path.sep)));
  const out: string[] = [];
  for (const base of ["app", "features"]) {
    for (const full of walk(path.join(root, base))) {
      const rel = path.relative(root, full);
      if (crafted.has(rel)) continue;
      if (PATTERN.test(executable(fs.readFileSync(full, "utf8")))) out.push(rel);
    }
  }
  return out.sort();
}

describe("the renderer is becoming the only way a record surface exists", () => {
  it("lets no module gain a hand-written record surface", () => {
    const actual: Record<string, number> = {};
    for (const file of handWrittenSurfaces()) {
      const mod = moduleOf(file);
      actual[mod] = (actual[mod] ?? 0) + 1;
    }

    const grown = Object.entries(actual)
      .filter(([mod, count]) => count > (REMAINING_BY_MODULE[mod] ?? 0))
      .map(([mod, count]) => `${mod}: ${REMAINING_BY_MODULE[mod] ?? 0} -> ${count}`);

    expect(grown).toEqual([]);
  });

  it("keeps no crafted exemption for a surface that no longer exists", () => {
    const root = path.join(__dirname, "../..");
    const missing = Object.keys(CRAFTED_BY_DESIGN).filter(
      (file) => !fs.existsSync(path.join(root, file)),
    );

    expect(missing).toEqual([]);
  });

  it("makes every crafted exemption argue for itself", () => {
    const unargued = Object.entries(CRAFTED_BY_DESIGN)
      .filter(([, why]) => why.trim().length < 40)
      .map(([file]) => file);

    expect(unargued).toEqual([]);
  });

  it("reports what is left, so a batch can be sized against it", () => {
    const total = handWrittenSurfaces().length;
    const frozen = Object.values(REMAINING_BY_MODULE).reduce((a, b) => a + b, 0);

    expect(total).toBeLessThanOrEqual(frozen);
  });

  it("holds the CRM at its migrated floor", () => {
    const crm = handWrittenSurfaces().filter((file) => moduleOf(file) === "crm");

    expect(crm.length).toBeLessThanOrEqual(REMAINING_BY_MODULE.crm ?? 0);
  });
});
