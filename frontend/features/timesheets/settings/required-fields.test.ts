import { readFileSync } from "node:fs";
import { backendPath } from "@/lib/test-support/backend-path";
import {
  CREATE_REQUIRED_FIELDS,
  SUBMIT_REQUIRED_FIELDS,
  missingOnCreate,
  missingOnSubmit,
  requiredFieldLabel,
  requiredFieldMessage,
} from "./required-fields";

const EMPTY = { projectId: null, ticketId: null, description: "" };

describe("missingOnCreate", () => {
  it("asks for nothing when the org requires nothing", () => {
    expect(missingOnCreate([], EMPTY)).toEqual([]);
  });

  it("accepts a ticket in place of a project, as the server does", () => {
    expect(missingOnCreate(["project"], { ...EMPTY, ticketId: 7 })).toEqual([]);
    expect(missingOnCreate(["project"], { ...EMPTY, projectId: 3 })).toEqual([]);
    expect(missingOnCreate(["project"], EMPTY)).toEqual(["project"]);
  });

  it("does not accept a project in place of a ticket", () => {
    expect(missingOnCreate(["ticket"], { ...EMPTY, projectId: 3 })).toEqual(["ticket"]);
    expect(missingOnCreate(["ticket"], { ...EMPTY, ticketId: 7 })).toEqual([]);
  });

  it("names every unsatisfied field, not just the first", () => {
    expect(missingOnCreate(["project", "description", "ticket"], EMPTY)).toEqual([
      "project",
      "description",
      "ticket",
    ]);
  });

  it("ignores a setting the server does not enforce", () => {
    expect(missingOnCreate(["billable", "workLink"], EMPTY)).toEqual([]);
  });
});

describe("missingOnSubmit", () => {
  /*
   * Submitting a period is checked against two fields, creating an entry
   * against three. An entry logged before `ticket` was made required still
   * submits; that is the server's behaviour and the reason these are two lists.
   */
  it("does not hold a period back for a missing ticket", () => {
    expect(missingOnSubmit(["ticket"], EMPTY)).toEqual([]);
    expect(missingOnCreate(["ticket"], EMPTY)).toEqual(["ticket"]);
  });

  it("holds a period back for a missing description or project", () => {
    expect(missingOnSubmit(["description", "project"], EMPTY)).toEqual([
      "description",
      "project",
    ]);
  });
});

/**
 * The drift guard, and the reason this file exists.
 *
 * `requiredFields` is enforced by hand-written `if`s inside two services, not
 * by a Zod schema, so no contract test could see it. The log-time form never
 * knew the setting existed: an org that ticked "Description" got
 * `Field 'description' is required` as a toast on every save, and an org that
 * ticked "Billable flag" got a setting that did nothing at all. Both halves of
 * that come from the same place — nobody comparing the two lists.
 */
describe("the required-field lists match the backend", () => {
  function enforcedIn(relativePath: string): string[] {
    const src = readFileSync(backendPath(relativePath), "utf8");
    return [...src.matchAll(/requiredFields\.includes\("([a-zA-Z]+)"\)/g)]
      .map((match) => match[1] as string)
      .sort();
  }

  it("holds exactly the fields createEntry checks", () => {
    const backendFields = enforcedIn("src/modules/timesheets/core/entries.service.ts");
    expect(backendFields.length).toBeGreaterThanOrEqual(3);
    expect([...new Set(backendFields)]).toEqual([...CREATE_REQUIRED_FIELDS].sort());
  });

  it("holds exactly the fields submitPeriod checks", () => {
    const backendFields = enforcedIn("src/modules/timesheets/core/periods-submit.service.ts");
    expect(backendFields.length).toBeGreaterThanOrEqual(2);
    expect([...new Set(backendFields)]).toEqual([...SUBMIT_REQUIRED_FIELDS].sort());
  });

  it("keeps the submit list a subset of the create list", () => {
    for (const field of SUBMIT_REQUIRED_FIELDS)
      expect(CREATE_REQUIRED_FIELDS).toContain(field);
  });

  it("gives every field a label and a message, so nothing renders a bare key", () => {
    for (const field of CREATE_REQUIRED_FIELDS) {
      expect(requiredFieldLabel(field)).not.toBe(field);
      expect(requiredFieldLabel(field).length).toBeGreaterThan(0);
      expect(requiredFieldMessage(field)).toMatch(/\s/);
    }
  });
});
