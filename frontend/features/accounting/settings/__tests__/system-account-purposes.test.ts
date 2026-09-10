import { readFileSync } from "node:fs";
import { backendPath } from "@/test-support/backend-checkout";
import { PURPOSE_LABELS } from "../fin-settings-labels";

/**
 * INV-09 — the settings screen offers exactly the purposes the API returns.
 *
 * `GET accounting/settings/system-accounts` returns a row for every purpose the
 * backend knows, and the screen renders `PURPOSE_LABELS[row.purpose]` straight
 * into the table cell, the setup wizard and the mapping dialog's title. So a
 * purpose the backend has and this repo does not is not a type error anywhere —
 * it is a blank row an admin cannot identify and a dialog headed
 * "Map account — undefined".
 *
 * That is exactly what adding inventory's six would have done: they went into
 * the backend's zod enum, the frontend union was a hand-kept transcription of
 * it, and nothing paired the two. The direction of the failure is the point —
 * the backend is where purposes are added, so this list can only ever fall
 * behind, and falling behind is invisible until someone opens the screen.
 *
 * `PURPOSE_LABELS` is `Record<SystemAccountPurpose, string>`, so its keys *are*
 * the union at runtime, guaranteed complete by the compiler. Reading them beats
 * regexing the type: a label added without a union member will not compile, and
 * a union member added without a label will not either.
 */

const SCHEMA = backendPath("src/modules/accounting/settings/dto/settings.schemas.ts");

/** The labels the backend's zod enum declares, parsed from its source. */
function backendPurposes(source: string): string[] {
  const block = source.match(/systemAccountPurposeSchema = z\.enum\(\[([\s\S]*?)\]\)/);
  if (!block?.[1]) throw new Error("systemAccountPurposeSchema not found in the backend schema file");
  // Strip comments first: the enum carries explanatory `//` lines, and a
  // quoted purpose named inside one would be read as a member.
  const withoutComments = block[1].replace(/\/\/.*$/gm, "");
  return [...withoutComments.matchAll(/"([A-Z0-9_]+)"/g)].map((m) => m[1] as string);
}

describe("system account purposes are shared with the backend", () => {
  // Skipped loudly rather than passing vacuously when there is no paired
  // backend checkout: an empty sweep must not read as agreement.
  const maybe = SCHEMA === null ? it.skip : it;

  if (SCHEMA === null) {
    it("reports that it could not find the backend to compare against", () => {
      expect(SCHEMA).not.toBeNull();
    });
  }

  maybe("offers a label for every purpose the API can return", () => {
    const backend = backendPurposes(readFileSync(SCHEMA as string, "utf8"));

    // Anti-vacuity: a regex that stopped matching would return [] and make the
    // subset check below trivially true.
    expect(backend.length).toBeGreaterThanOrEqual(24);

    const frontend = Object.keys(PURPOSE_LABELS);
    expect([...frontend].sort()).toEqual([...backend].sort());
  });

  maybe("names inventory's six, so INV-09's mappings are reachable", () => {
    for (const purpose of [
      "INVENTORY_ASSET",
      "INVENTORY_COGS",
      "INVENTORY_GRNI",
      "INVENTORY_LANDED_COST_CLEARING",
      "INVENTORY_WRITE_OFF",
      "INVENTORY_ADJUSTMENT_GAIN_LOSS",
    ]) {
      expect(Object.keys(PURPOSE_LABELS)).toContain(purpose);
      expect(PURPOSE_LABELS[purpose as keyof typeof PURPOSE_LABELS]).toBeTruthy();
    }
  });
});
