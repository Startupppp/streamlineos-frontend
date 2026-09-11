import { readFileSync } from "node:fs";
import { join } from "node:path";
import { backendPath, backendReachable } from "@/lib/test-support/backend-path";
import { describeConsentActor } from "./contact-consent-history";

/**
 * Who a change is attributed to, which the trail stores only as an id.
 *
 * Four distinguishable cases, and the temptation is to collapse the last three
 * into "System". That would say the product opted somebody out when in fact
 * they opted themselves out through the unsubscribe link — which is the exact
 * claim a complaint turns on.
 */
describe("attributing a consent change", () => {
  it("names the colleague when the join found one", () => {
    expect(
      describeConsentActor({
        recordedByName: "Asha Menon",
        recordedByUserId: "user-1",
        source: "USER_ENTRY",
      }),
    ).toBe("Asha Menon");
  });

  it("says an actor existed but is gone, rather than inventing a system", () => {
    expect(
      describeConsentActor({
        recordedByName: null,
        recordedByUserId: "user-gone",
        source: "USER_ENTRY",
      }),
    ).toBe("A colleague no longer in this workspace");
  });

  it("credits the contact for their own unsubscribe", () => {
    const described = describeConsentActor({
      recordedByName: null,
      recordedByUserId: null,
      source: "UNSUBSCRIBE_LINK",
    });
    expect(described).toContain("contact");
    expect(described).not.toContain("System");
  });

  it("does not claim a person when none was recorded", () => {
    expect(
      describeConsentActor({
        recordedByName: null,
        recordedByUserId: null,
        source: "IMPORT",
      }),
    ).toBe("No person recorded");
  });

  it("prefers the name over the id, which is the whole ordering", () => {
    /*
      Reversing the first two branches passes every case above except this one:
      a live colleague with a resolved name would render as "no longer in this
      workspace".
    */
    expect(
      describeConsentActor({
        recordedByName: "Asha Menon",
        recordedByUserId: "user-1",
        source: "IMPORT",
      }),
    ).toBe("Asha Menon");
  });

  it("never returns a raw id, whatever it is handed", () => {
    const id = "6f0b6a3e-9c2f-4a6f-8a11-0b5f0f4e1c22";
    for (const name of [null, "Asha Menon"]) {
      expect(
        describeConsentActor({ recordedByName: name, recordedByUserId: id, source: "API" }),
      ).not.toContain(id);
    }
  });
});

function keysOfBlock(source: string, start: string, end: string): string[] {
  const from = source.indexOf(start);
  expect(from).toBeGreaterThanOrEqual(0);
  const body = source.slice(from + start.length, source.indexOf(end, from));
  /* Strip comments first: a field name inside prose is not a field. */
  const code = body.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  return [...code.matchAll(/^\s{2,}(\w+)\s*[:?]/gm)].map((m) => m[1]!);
}

/**
 * The two halves of the contract, read from the two repositories.
 *
 * Root §5: a client type that drifts from the backend's Zod schema or projection
 * silently strips fields into no-ops. Here the failure would be quiet in the
 * worst way — a column the backend stops returning leaves the history rendering
 * "undefined" attribution for an audit, which is the one surface that must not
 * be approximately right.
 */
describe("the event contract matches the API's projection", () => {
  const relative = "src/modules/crm/consent/crm-consent.service.ts";

  it("can see the backend at all", () => {
    /*
      Asserted, never skipped. Five cross-repo guards in this repo resolved to a
      path that does not exist and returned early, so they stayed green for
      months while the drift they exist to catch went unwatched.
    */
    expect(backendReachable(relative)).toBe(true);
  });

  it("declares exactly the fields the service projects", () => {
    const service = readFileSync(backendPath(relative), "utf8");
    const projected = keysOfBlock(
      service,
      "async listConsentEvents(orgId: string, contactId: number, limit: number) {",
      ".from(crmContactConsentEvents)",
    );

    const hook = readFileSync(join(__dirname, "../../../../hooks/api/crm/consent.ts"), "utf8");
    const declared = keysOfBlock(hook, "export interface ContactConsentEvent {", "\n}");

    expect(projected.length).toBeGreaterThan(5);
    expect(declared.sort()).toEqual(projected.sort());
  });
});
