import { readFileSync } from "node:fs";
import { backendPath } from "@/lib/test-support/backend-path";
import {
  MATERIAL_SETTING_FIELDS,
  describeMaterialChanges,
  materialChangesIn,
} from "./settings-material-changes";

describe("materialChangesIn", () => {
  it("asks for a reason when a material setting actually moves", () => {
    expect(materialChangesIn({ approvalMode: "AUTO" })).toEqual(["approvalMode"]);
  });

  it("asks for nothing when the diff is empty", () => {
    /*
     * The server checks the diff against stored values for this reason: a
     * requirement that fires when nothing changed is one people satisfy with a
     * full stop, and the history fills with "." instead of reasons.
     */
    expect(materialChangesIn({})).toEqual([]);
  });

  it("ignores a change the server does not treat as material", () => {
    expect(materialChangesIn({ changeReason: "because" })).toEqual([]);
  });

  it("names the settings in English rather than dumping JSON keys", () => {
    const described = describeMaterialChanges(
      materialChangesIn({ approvalMode: "AUTO", submissionGraceDays: 5 }),
    );
    expect(described).toBe("approval mode and submission grace period");
  });

  it("reads as a sentence for one, two and three changes", () => {
    expect(describeMaterialChanges(["roundingRule"])).toBe("rounding rule");
    expect(describeMaterialChanges(["roundingRule", "approvalMode"])).toBe(
      "rounding rule and approval mode",
    );
    expect(
      describeMaterialChanges(["roundingRule", "approvalMode", "workWeekStart"]),
    ).toBe("rounding rule, approval mode and week start");
  });
});

/**
 * The drift guard, and the reason this file exists.
 *
 * TS-16 added `MATERIAL_FIELDS` to the backend and made a reason mandatory for
 * them. The form never grew a field to supply one — and because every setting
 * this form edits is on that list, `PATCH /timesheets/settings` refused every
 * save with `A changeReason is required when changing approvalMode`. The
 * timesheet settings screen could not save anything at all, and no test in
 * either repository noticed, because each side was internally consistent.
 *
 * So this reads the backend's own list. A field added there and not here brings
 * the wall straight back; a field removed there and not here asks the user for
 * a justification nobody wanted.
 */
describe("the material-field list matches the backend", () => {
  it("holds exactly the fields MATERIAL_FIELDS names, minus the payroll ones", () => {
    const src = readFileSync(
      backendPath("src/modules/timesheets/core/settings.service.ts"),
      "utf8",
    );
    const block = /const MATERIAL_FIELDS = new Set\(\[([\s\S]*?)\]\)/.exec(src);
    expect(block).not.toBeNull();

    const backendFields = [...(block?.[1] ?? "").matchAll(/"([a-zA-Z]+)"/g)]
      .map((m) => m[1])
      .sort();

    expect(backendFields.length).toBeGreaterThan(10);
    expect([...MATERIAL_SETTING_FIELDS].sort()).toEqual(backendFields);
  });

  it("gives every field a human label, so no prompt can render a bare key", () => {
    for (const field of MATERIAL_SETTING_FIELDS) {
      const label = describeMaterialChanges([field]);
      expect(label).not.toBe("");
      expect(label).not.toBe(field);
    }
  });
});
