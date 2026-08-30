import fs from "node:fs";
import path from "node:path";

/**
 * How many record surfaces are still hand-written, per module.
 *
 * Phase 4, tickets 15 and 16. Ticket 15 moves every module onto the renderer in
 * batches; ticket 16 asks that the engine become the only way a record surface
 * exists, enforced rather than maintained by discipline. This is the enforcement,
 * and it is also ticket 15's fifth criterion — "progress is measurable: the count
 * of hand-written record surfaces remaining is reported".
 *
 * A frozen per-module count rather than a frozen file list, deliberately. The
 * migration lands one module at a time, and a per-module number lets a batch drop
 * to zero without touching any other module's entry — a single list of 530 paths
 * would conflict on every batch and be rewritten wholesale rather than read.
 *
 * The numbers may only fall. A module that gains a hand-written table fails this,
 * which is the regression the ticket exists to stop: the CRM was migrated, and
 * without a ratchet nothing prevents the next feature there being hand-built
 * again while everybody assumes the engine is now the only way.
 *
 * `crm` is the proof the migration works: 6, down from the whole module, and the
 * survivors are the crafted surfaces ticket 19 argued for one by one.
 */
const REMAINING_BY_MODULE: Readonly<Record<string, number>> = {
  // Arrived with main. Counted rather than exempted: it is a hand-written record
  // surface like the rest, and the point of this map is that what remains stays
  // countable until it is described to the renderer.
  "careers": 1,
  "hr": 122,
  "inventory": 96,
  "build": 76,
  "payroll": 53,
  "accounting": 32,
  "settings": 27,
  "timesheets": 23,
  "support": 15,
  "billing": 10,
  "users": 10,
  "sign": 8,
  "directory": 7,
  "crm": 6,
  "surveys": 6,
  "wiki": 5,
  "landing": 4,
  "notifications": 4,
  "help-centre": 3,
  "chat": 2,
  "employee-onboarding": 2,
  "module-access": 2,
  "portal-access": 2,
  "renderer": 2,
  "workflows": 2,
  "auth": 1,
  "calendar": 1,
  "feedbucket": 1,
  "forms": 1,
  "intake": 1,
  "invitation": 1,
  "legal": 1,
  "mail": 1,
  "party": 1,
  "payments": 1,
  "portal": 1,
};

/**
 * Surfaces that are hand-written on purpose and always will be.
 *
 * Ticket 16 asks for "an explicit allowlist rather than a convention", and this
 * is the difference between the two: a surface here has an argument attached and
 * somebody had to write it down. A surface merely not yet migrated is counted
 * above instead, where it shows up as debt rather than as a decision.
 */
const CRAFTED_BY_DESIGN: Readonly<Record<string, string>> = {
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
};

const PATTERN = /DataTableColumn<|<table[ >]|useForm[<(]/;

/** Comments describe removed markup constantly; only code renders any. */
function executable(source: string): string {
  return source
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
  const out: string[] = [];
  for (const base of ["app", "features"]) {
    for (const full of walk(path.join(root, base))) {
      const rel = path.relative(root, full);
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

    // Describe the surface with a layout in `lib/renderer/` and render it with
    // RecordList/RecordDetail/RecordForm. If it genuinely cannot be described,
    // add it to CRAFTED_BY_DESIGN with the argument for why.
    expect(grown).toEqual([]);
  });

  it("keeps no crafted exemption for a surface that no longer exists", () => {
    const root = path.join(__dirname, "../..");
    const missing = Object.keys(CRAFTED_BY_DESIGN).filter(
      (file) => !fs.existsSync(path.join(root, file)),
    );

    // An exemption for a deleted file is one nobody is stopped from recreating.
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

    // Not an assertion about progress -- a number that shows up in the run, so
    // ticket 15's batches have a denominator rather than a feeling.
    expect(total).toBeLessThanOrEqual(frozen);
  });

  it("holds the CRM at its migrated floor", () => {
    const crm = handWrittenSurfaces().filter((file) => moduleOf(file) === "crm");

    // The module the engine was built for. Everything left here is in
    // CRAFTED_BY_DESIGN or is the import plan's own two files.
    expect(crm.length).toBeLessThanOrEqual(REMAINING_BY_MODULE.crm ?? 0);
  });
});
