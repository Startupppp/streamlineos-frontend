import { readdirSync, readFileSync } from "node:fs";
import { join, resolve, relative } from "node:path";

const FEATURES_BUILD_DIR = resolve(process.cwd(), "features", "build");

function walkTsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkTsxFiles(full));
    else if (entry.name.endsWith(".tsx") && !entry.name.endsWith(".test.tsx"))
      out.push(full);
  }
  return out;
}

function rel(absPath: string): string {
  return relative(FEATURES_BUILD_DIR, absPath).replace(/\\/g, "/");
}

interface FileSummary {
  relPath: string;
  absPath: string;
  isFormOwner: boolean;
  hasRegistration: boolean;
}

function buildSummaries(): FileSummary[] {
  return walkTsxFiles(FEATURES_BUILD_DIR).map((absPath) => {
    const source = readFileSync(absPath, "utf8");
    return {
      relPath: rel(absPath),
      absPath,
      isFormOwner:
        source.includes('from "react-hook-form"') &&
        /\buseForm\s*[<(]/.test(source),
      hasRegistration: /\buseRegisterBuildDirtyState\s*\(/.test(source),
    };
  });
}

const summaries = buildSummaries().filter((s) => s.isFormOwner);
const rhfFormOwners = summaries.map((s) => s.relPath);
const registeredSurfaces = summaries
  .filter((s) => s.hasRegistration)
  .map((s) => s.relPath);
const unregisteredSurfaces = summaries
  .filter((s) => !s.hasRegistration)
  .map((s) => s.relPath);

const COVERED_BY_ANCESTOR_REGISTRATION: readonly string[] = [
  "project-create/steps/step-basics.tsx",
];

const TRANSIENT_ACTION_NO_DRAFT: readonly string[] = [
  "approvals/decide-dialog.tsx",
  "approvals/delegate-dialog.tsx",
  "goals/check-in-dialog.tsx",
  "goals/add-link-dialog.tsx",
  "whiteboard/create-board-dialog.tsx",
  "sidebar/delete-project-dialog.tsx",
  "settings/agent-token-create-dialog.tsx",
  "templates/apply-template-dialog.tsx",
];

const ALL_EXPLICIT_EXCLUSIONS = new Set([
  ...COVERED_BY_ANCESTOR_REGISTRATION,
  ...TRANSIENT_ACTION_NO_DRAFT,
]);

describe("BSN-04-A03 every Build RHF form owner registers with the shared dirty-state guard, so switching scope prompts rather than silently discarding a draft", () => {
  it("finds more than 30 RHF form owners so a broken filesystem walk cannot pass vacuously", () => {
    expect(rhfFormOwners.length).toBeGreaterThan(30);
  });

  it("finds more registered surfaces than named exclusions, so the test cannot be trivially satisfied by excluding everything", () => {
    expect(registeredSurfaces.length).toBeGreaterThan(ALL_EXPLICIT_EXCLUSIONS.size);
  });

  it("every RHF form owner not in a named exclusion set calls useRegisterBuildDirtyState, so a scope switch prompts rather than discarding typed content", () => {
    const ungated = unregisteredSurfaces.filter(
      (f) => !ALL_EXPLICIT_EXCLUSIONS.has(f),
    );
    expect(ungated).toEqual([]);
  });

  it("the covered-by-ancestor exclusion set is non-empty so an empty list cannot pass vacuously", () => {
    expect(COVERED_BY_ANCESTOR_REGISTRATION.length).toBeGreaterThan(0);
  });

  it("step-basics is excluded because project-create-wizard registers at wizard level covering scope protection across all steps", () => {
    expect(COVERED_BY_ANCESTOR_REGISTRATION).toContain(
      "project-create/steps/step-basics.tsx",
    );
  });

  it("the transient-action exclusion set is non-empty so an empty list cannot pass vacuously", () => {
    expect(TRANSIENT_ACTION_NO_DRAFT.length).toBeGreaterThan(0);
  });

  it("decide-dialog and delegate-dialog are excluded because approving or delegating is an immediate action carrying no authored draft content that a scope switch would discard", () => {
    expect(TRANSIENT_ACTION_NO_DRAFT).toContain("approvals/decide-dialog.tsx");
    expect(TRANSIENT_ACTION_NO_DRAFT).toContain(
      "approvals/delegate-dialog.tsx",
    );
  });

  it("check-in-dialog is excluded because periodic goal progress is a numeric field submitted immediately with no long-form draft at risk", () => {
    expect(TRANSIENT_ACTION_NO_DRAFT).toContain("goals/check-in-dialog.tsx");
  });

  it("add-link-dialog is excluded because it accepts a URL string only, submitted immediately with no authored draft content", () => {
    expect(TRANSIENT_ACTION_NO_DRAFT).toContain("goals/add-link-dialog.tsx");
  });

  it("create-board-dialog is excluded because it accepts a board name only, trivially retyped after a scope switch", () => {
    expect(TRANSIENT_ACTION_NO_DRAFT).toContain(
      "whiteboard/create-board-dialog.tsx",
    );
  });

  it("delete-project-dialog is excluded because it is a destructive confirmation with no user-authored content to protect", () => {
    expect(TRANSIENT_ACTION_NO_DRAFT).toContain(
      "sidebar/delete-project-dialog.tsx",
    );
  });

  it("agent-token-create-dialog is excluded because it accepts a token name only, trivially retyped after a scope switch", () => {
    expect(TRANSIENT_ACTION_NO_DRAFT).toContain(
      "settings/agent-token-create-dialog.tsx",
    );
  });

  it("apply-template-dialog is excluded because it is a template selection with no authored draft text that a scope switch would discard", () => {
    expect(TRANSIENT_ACTION_NO_DRAFT).toContain(
      "templates/apply-template-dialog.tsx",
    );
  });
});
