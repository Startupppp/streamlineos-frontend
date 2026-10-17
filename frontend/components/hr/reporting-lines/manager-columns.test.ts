import { normalizeHeader } from "@/features/hr/onboarding/bulk-onboard-columns";
import { normalizeMappingHeader } from "@/features/hr/reporting-managers/bulk/mapping-file";
import {
  LEGACY_PRIMARY_MANAGER_COLUMNS,
  MANAGER_HEADER_ALIASES,
  collectManagerColumns,
  resolveManagerHeader,
} from "./manager-columns";

describe("the one manager-column alias map (HRM-15, mirrors backend reporting-manager-columns.ts)", () => {
  it("carries the backend's legacy primary headers", () => {
    expect([...LEGACY_PRIMARY_MANAGER_COLUMNS]).toEqual(["reportingManagerEmail", "reportsTo", "managerEmail"]);
    for (const header of LEGACY_PRIMARY_MANAGER_COLUMNS)
      expect(resolveManagerHeader(header)).toEqual({ column: "primaryManagerEmail", legacy: true });
  });

  it("keeps the human-friendly variants, ignoring case, spaces, _ and -", () => {
    expect(resolveManagerHeader("Reporting Manager")).toEqual({ column: "primaryManagerEmail", legacy: true });
    expect(resolveManagerHeader("manager")).toEqual({ column: "primaryManagerEmail", legacy: true });
    expect(resolveManagerHeader("Manager Email")).toEqual({ column: "primaryManagerEmail", legacy: true });
    expect(resolveManagerHeader("primary_manager-email")).toEqual({ column: "primaryManagerEmail", legacy: false });
    expect(resolveManagerHeader("Primary manager")).toEqual({ column: "primaryManagerEmail", legacy: false });
    expect(resolveManagerHeader("Secondary manager 2")).toEqual({ column: "secondaryManagerEmail2", legacy: false });
    expect(resolveManagerHeader("department")).toBeNull();
  });

  it("is the map both spreadsheet readers use — they agree on every alias", () => {
    for (const header of MANAGER_HEADER_ALIASES) {
      const column = resolveManagerHeader(header)?.column;
      expect({ header, onboarding: normalizeHeader(header) }).toEqual({ header, onboarding: column });
      expect({ header, mapping: normalizeMappingHeader(header) }).toEqual({ header, mapping: column });
    }
  });
});

describe("collectManagerColumns", () => {
  it("takes the canonical value and reports no legacy use when both headers agree", () => {
    expect(collectManagerColumns({ primaryManagerEmail: "Boss@Example.com", reportsTo: "boss@example.com" })).toEqual({
      values: { primaryManagerEmail: "boss@example.com" },
      conflicts: [],
      legacyPrimaryHeader: null,
    });
  });

  it("names the legacy header when it alone supplied the primary", () => {
    expect(collectManagerColumns({ "Reports To": "boss@example.com", primaryManagerEmail: " " })).toEqual({
      values: { primaryManagerEmail: "boss@example.com" },
      conflicts: [],
      legacyPrimaryHeader: "Reports To",
    });
  });

  it("refuses to guess when two headers disagree", () => {
    const result = collectManagerColumns({ primaryManagerEmail: "a@example.com", managerEmail: "b@example.com" });
    expect(result.conflicts).toEqual(["primaryManagerEmail"]);
    expect(result.values).not.toHaveProperty("primaryManagerEmail");
  });
});
