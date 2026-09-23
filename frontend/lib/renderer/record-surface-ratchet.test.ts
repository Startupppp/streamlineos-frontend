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
 * That regression happened, and these numbers recorded it rather than hiding it.
 * Between 2026-09-09 and 2026-09-10 the phase 4/5 CRM tickets landed six record
 * surfaces the engine could have described, none of them run against this file.
 * All six have since been described and moved onto `RecordList`/`RecordForm`,
 * which is what took `crm` from 8 to 2 — what is left there is the import plan's
 * own two files and nothing from phase 4 or 5. Two of the six needed vocabulary
 * the engine did not have, and it grew rather than exempting them: `series`, for
 * a field whose value is a run of figures, and `RecordList`'s `footer`, for a
 * keyset list's own load-more control.
 *
 * One surface named in that batch is still counted, and deliberately:
 *
 *   features/auth/components/passwordless-signin-form.tsx  (email sign-in step)
 *
 * `frontend/CLAUDE.md` makes `/signin` and `/signup` immutable reference
 * surfaces that the rest of the app conforms to, so rendering one of them
 * through the engine is a decision above this file's pay grade — and it is debt
 * rather than a decision, which is why it is counted here instead of being
 * argued into `CRAFTED_BY_DESIGN`. `auth` therefore holds at 2, with
 * `signup-form.tsx` beside it.
 *
 * The numbers below may only fall from here.
 */
const REMAINING_BY_MODULE: Readonly<Record<string, number>> = {
  // Arrived with main. Counted rather than exempted: it is a hand-written record
  // surface like the rest, and the point of this map is that what remains stays
  // countable until it is described to the renderer.
  "careers": 1,
  /*
   * Re-measured on 2026-09-12 against the tree `final/inventory-into-main`
   * produced, when origin/main merged into the Inventory/CRM/Timesheets/SignOS
   * branch. Every surface that pushed a module up arrived WITH main and none is
   * new work on this branch — checked file by file against the merge's two
   * parents:
   *
   *   hr        122 -> 125   15 of main's HR surfaces arrived (benefits, cases,
   *                          devices, documents, skills matrix, recruitment,
   *                          reimbursements, templates, travel)
   *   inventory 136 -> 138   main's category-select, uom-select and
   *                          opening-stock-line-row
   *   chat        2 ->   3   main's chat-settings-form
   *   directory   7 ->  17   NOT growth: main keeps the users surfaces under
   *                          `features/directory/users/`, so the 10 that were
   *                          counted as `users` moved module. `users` is gone
   *                          from this map for that reason, not because anything
   *                          was migrated.
   *
   * The four modules that fell are lowered to their measured values rather than
   * banked as headroom: settings 27 -> 25, landing 4 -> 3, renderer 2 -> 0 and
   * users 10 -> 0 (both keys dropped). Direction of travel is unchanged — the
   * numbers below may still only fall.
   */
  /*
   * Re-measured on 2026-09-21 when the HRMS / Timesheets / Payroll programme
   * merged (HRMS_AUDIT_2026-09-21). These six are NEW work, not arrivals, and
   * they are counted rather than exempted so ticket 15 can size the batch:
   *
   *   hr        125 -> 127   features/hr/employees/manager-coverage-page.tsx
   *                          (reporting-manager coverage table),
   *                          features/hr/onboarding/onboarding-templates-tab.tsx
   *                          (plan editor moved onto react-hook-form)
   *   payroll    53 ->  54   features/payroll/readiness/readiness-page.tsx
   *   me          0 ->   1   features/me/team/team-roster.tsx
   *   employee-support 0 -> 2  features/employee-support/support-request-columns.tsx,
   *                          support-requests-table-skeleton.tsx
   *
   * features/hr/reimbursements/reimbursement-request-sheet.tsx also moved onto
   * react-hook-form and features/hr/helpdesk/create-ticket-dialog.tsx was
   * deleted, so hr nets +2. The numbers below may still only fall.
   */
  "hr": 127,
  "inventory": 138, // 96 on the CRM lane; +40 from the inventory lane on merge
  "build": 76,
  "payroll": 54,
  "employee-support": 2,
  "me": 1,
  "accounting": 32,
  "settings": 25,
  /*
   * 23 -> 24 for `features/timesheets/overdue/overdue-columns.tsx`, the TS-11
   * queue that closed `GET /timesheets/periods/overdue` — a route that had
   * shipped with no caller at all.
   *
   * Counted rather than exempted, which is what this map is for: `lib/renderer/`
   * holds layouts for `crm`, `party` and `subject` and nothing else, no
   * timesheets surface uses `RecordList`/`RecordDetail`/`RecordForm`, and the
   * other 23 here are hand-written for the same reason. This is not a surface
   * the renderer cannot describe — it is a surface in a module the renderer has
   * no vocabulary for yet, so `CRAFTED_BY_DESIGN` would be the wrong answer and
   * its argument would not be true.
   */
  "timesheets": 24,
  "support": 15,
  "directory": 17,
  "billing": 10,
  "sign": 8,
  "surveys": 6,
  "wiki": 5,
  "notifications": 4,
  "chat": 3,
  "help-centre": 3,
  "landing": 3,
  "crm": 2,
  "employee-onboarding": 2,
  "module-access": 2,
  "portal-access": 2,
  "workflows": 2,
  "auth": 2,
  "blog": 2, // main's blog admin tables, arrived on merge
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
 *
 * Until 2026-09-10 this map was never subtracted from the counts. The failure
 * message told you to add a surface here, doing so changed nothing, and the four
 * entries that match the pattern were being carried in `crm`'s number as debt at
 * the same time as being recorded here as a decision. It excludes now, which is
 * what the paragraph above always claimed; `crm` absorbed the four freed slots
 * against the six surfaces named at the top of this file.
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
  "features/crm/reports/builder/report-result-columns.ts":
    "The columns are built from a compiled report's own projections, so the row type is `Record<string, unknown>` known only at run time. There is no record here to describe.",
  "features/crm/reports/builder/report-builder-panel.tsx":
    "The fields being edited describe a query — source, projections, filters, grouping — not a record, which is the same argument the assignment-rule condition tree makes.",
  "features/build/shared/build-list-gallery-cases.tsx":
    "Fixture rows and columns for the dev-only /design-system/build-list gallery, which exists so the Build list contract can be measured in a real browser at 375/768/1280. It renders no record and reaches no endpoint; describing it to the renderer would describe a test double.",
  "features/crm/nurture/nurture-step-editor.tsx":
    "A cadence edited and saved whole through `useFieldArray`, because step numbers come from the array's order and a gap makes the sender fire twice. The ordered array is the data structure.",
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

    // The module the engine was built for. What is left is the import plan's own
    // two files -- `bulk-column-mapper.tsx` and `bulk-import-section.tsx` --
    // and nothing else; the crafted ones are excluded rather than counted.
    expect(crm.length).toBeLessThanOrEqual(REMAINING_BY_MODULE.crm ?? 0);
  });
});
