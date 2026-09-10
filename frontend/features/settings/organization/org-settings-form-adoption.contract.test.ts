import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SECTION_DIR = __dirname;
const SHARED_OWNER = "use-organization-settings-form";

type Exemption = { file: string; reason: string };

const EXEMPT_SECTIONS: readonly Exemption[] = [
  {
    file: "org-holiday-calendar-section.tsx",
    reason:
      "collection CRUD — its own add-form plus per-row delete across two mutations, not one record with edit/cancel/save",
  },
  {
    file: "org-data-privacy-section.tsx",
    reason: "presentation-only — local Select state with no mutation and no save action",
  },
  {
    file: "org-incoming-transfer-section.tsx",
    reason: "confirmation surface — accept/decline through ConfirmDialog, no form and no draft state",
  },
  {
    file: "org-danger-zone-section.tsx",
    reason: "confirmation surface — irreversible lifecycle actions through ConfirmDialog, no editable record",
  },
];

const MIGRATED_SECTIONS = [
  "org-branding-section.tsx",
  "org-business-hours-section.tsx",
  "org-config-section.tsx",
  "org-localization-section.tsx",
  "org-profile-section.tsx",
  "org-security-section.tsx",
] as const;

function sectionFiles(): string[] {
  return readdirSync(SECTION_DIR)
    .filter((name) => name.startsWith("org-") && name.endsWith("-section.tsx"))
    .sort();
}

function usesSharedOwner(file: string): boolean {
  return readFileSync(join(SECTION_DIR, file), "utf8").includes(SHARED_OWNER);
}

function reimplementsProtocol(file: string): boolean {
  const source = readFileSync(join(SECTION_DIR, file), "utf8");
  return source.includes("useForm<") || /useForm\(/.test(source);
}

describe("organization settings sections have one form owner", () => {
  it("finds every section file on disk", () => {
    const files = sectionFiles();
    expect(files.length).toBeGreaterThanOrEqual(10);
    expect(files).toEqual(
      [...MIGRATED_SECTIONS, ...EXEMPT_SECTIONS.map((e) => e.file)].sort(),
    );
  });

  it("every non-exempt section delegates to the shared owner", () => {
    const exempt = new Set(EXEMPT_SECTIONS.map((e) => e.file));
    const offenders = sectionFiles()
      .filter((file) => !exempt.has(file))
      .filter((file) => !usesSharedOwner(file));
    expect(offenders).toEqual([]);
  });

  it("no migrated section calls useForm directly — the shared owner owns the form", () => {
    const offenders = MIGRATED_SECTIONS.filter(reimplementsProtocol);
    expect(offenders).toEqual([]);
  });

  it("every exemption names a real file and carries a reason", () => {
    const onDisk = new Set(sectionFiles());
    for (const exemption of EXEMPT_SECTIONS) {
      expect(onDisk.has(exemption.file)).toBe(true);
      expect(exemption.reason.length).toBeGreaterThan(20);
      expect(usesSharedOwner(exemption.file)).toBe(false);
    }
  });

  it("the detectors bite rather than reporting a clean tree they never read", () => {
    expect(usesSharedOwner("org-profile-section.tsx")).toBe(true);
    expect(usesSharedOwner("org-danger-zone-section.tsx")).toBe(false);
    expect(reimplementsProtocol("use-organization-settings-form.ts")).toBe(true);
    expect(() => readFileSync(join(SECTION_DIR, "no-such-section.tsx"), "utf8")).toThrow();
  });
});
