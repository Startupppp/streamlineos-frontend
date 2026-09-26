import {
  projectRetentionSettingsContract,
  updateRetentionPolicySchema,
  setLegalHoldSchema,
  parseRetentionSection,
  retentionDaysOptionSchema,
} from "./project-settings-retention-schema";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

const VALID_SETTINGS = {
  projectId: 1,
  inheritOrgPolicy: true,
  closedTicketRetentionDays: null,
  attachmentRetentionDays: null,
  auditLogRetentionDays: null,
  legalHold: false,
  legalHoldReason: null,
  legalHoldSetAt: null,
  version: 1,
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("projectRetentionSettingsContract (BLD-RETENTION-C5-001)", () => {
  it("accepts a fully populated retention settings response with null retention days (inherit mode)", () => {
    expect(projectRetentionSettingsContract.safeParse(VALID_SETTINGS).success).toBe(true);
  });

  it("accepts a response with preset retention days set on every field", () => {
    const withDays = {
      ...VALID_SETTINGS,
      inheritOrgPolicy: false,
      closedTicketRetentionDays: 90,
      attachmentRetentionDays: 180,
      auditLogRetentionDays: 365,
    };
    expect(projectRetentionSettingsContract.safeParse(withDays).success).toBe(true);
  });

  it("accepts a response where legal hold is active with a reason and timestamp", () => {
    const withHold = {
      ...VALID_SETTINGS,
      legalHold: true,
      legalHoldReason: "Litigation hold #2026-001",
      legalHoldSetAt: "2026-06-01T10:00:00Z",
    };
    expect(projectRetentionSettingsContract.safeParse(withHold).success).toBe(true);
  });

  it("rejects a response where closedTicketRetentionDays is a non-preset value (e.g. 45) so a days mismatch is caught at parse time", () => {
    const bad = { ...VALID_SETTINGS, inheritOrgPolicy: false, closedTicketRetentionDays: 45 };
    expect(projectRetentionSettingsContract.safeParse(bad).success).toBe(false);
  });

  it("rejects a response where legalHold is sent as the string \"false\" because boolean fields must be actual booleans", () => {
    expect(projectRetentionSettingsContract.safeParse({ ...VALID_SETTINGS, legalHold: "false" }).success).toBe(false);
  });

  it("rejects a response missing updatedAt so a stripped projection is detected before it reaches the UI", () => {
    const { updatedAt: _dropped, ...without } = VALID_SETTINGS;
    expect(projectRetentionSettingsContract.safeParse(without).success).toBe(false);
  });

  it("rejects a response where projectId is a string instead of an integer", () => {
    expect(projectRetentionSettingsContract.safeParse({ ...VALID_SETTINGS, projectId: "1" }).success).toBe(false);
  });
});

describe("updateRetentionPolicySchema (BLD-RETENTION-C5-002)", () => {
  it("accepts a valid update with inheritOrgPolicy true and all retention days null", () => {
    const input = {
      inheritOrgPolicy: true,
      closedTicketRetentionDays: null,
      attachmentRetentionDays: null,
      auditLogRetentionDays: null,
    };
    expect(updateRetentionPolicySchema.safeParse(input).success).toBe(true);
  });

  it("accepts a valid update with inheritOrgPolicy false and preset days on all fields", () => {
    const input = {
      inheritOrgPolicy: false,
      closedTicketRetentionDays: 30,
      attachmentRetentionDays: 365,
      auditLogRetentionDays: 60,
    };
    expect(updateRetentionPolicySchema.safeParse(input).success).toBe(true);
  });

  it("rejects a mutation body with an unknown extra field so the strict contract catches fat payloads", () => {
    const withExtra = {
      inheritOrgPolicy: true,
      closedTicketRetentionDays: null,
      attachmentRetentionDays: null,
      auditLogRetentionDays: null,
      unknownField: "should not be here",
    };
    expect(updateRetentionPolicySchema.safeParse(withExtra).success).toBe(false);
  });

  it("rejects a mutation body where a retention days field is a non-preset integer (e.g. 7)", () => {
    const bad = {
      inheritOrgPolicy: false,
      closedTicketRetentionDays: 7,
      attachmentRetentionDays: null,
      auditLogRetentionDays: null,
    };
    expect(updateRetentionPolicySchema.safeParse(bad).success).toBe(false);
  });
});

describe("setLegalHoldSchema (BLD-RETENTION-C5-003)", () => {
  it("accepts active=true with no reason (reason is optional)", () => {
    expect(setLegalHoldSchema.safeParse({ active: true }).success).toBe(true);
  });

  it("accepts active=true with a non-empty reason string", () => {
    expect(setLegalHoldSchema.safeParse({ active: true, reason: "Regulatory audit" }).success).toBe(true);
  });

  it("accepts active=false with no reason field (removing a hold)", () => {
    expect(setLegalHoldSchema.safeParse({ active: false }).success).toBe(true);
  });

  it("rejects an unknown extra field so the strict schema catches unintended fields", () => {
    expect(setLegalHoldSchema.safeParse({ active: true, unknownField: "x" }).success).toBe(false);
  });

  it("rejects active sent as a string instead of a boolean", () => {
    expect(setLegalHoldSchema.safeParse({ active: "true" }).success).toBe(false);
  });
});

describe("retentionDaysOptionSchema — preset values only (BLD-RETENTION-C5-004)", () => {
  it.each([30, 60, 90, 180, 365])(
    "accepts %i as a valid preset retention period",
    (days) => {
      expect(retentionDaysOptionSchema.safeParse(days).success).toBe(true);
    },
  );

  it("accepts null (meaning 'forever', no automatic deletion)", () => {
    expect(retentionDaysOptionSchema.safeParse(null).success).toBe(true);
  });

  it.each([1, 7, 14, 45, 100, 200, 400, 366])(
    "rejects %i as a non-preset retention period so arbitrary integers cannot bypass the enum",
    (days) => {
      expect(retentionDaysOptionSchema.safeParse(days).success).toBe(false);
    },
  );
});

describe("parseRetentionSection — URL state predicate (BLD-RETENTION-C5-005)", () => {
  it("returns policy for null (default section when no URL param is set)", () => {
    expect(parseRetentionSection(null)).toBe("policy");
  });

  it("returns holds for the holds section param so deep-links to legal hold work", () => {
    expect(parseRetentionSection("holds")).toBe("holds");
  });

  it("returns policy for policy so the first section can also be deep-linked", () => {
    expect(parseRetentionSection("policy")).toBe("policy");
  });

  it("returns policy (not throws) for an unrecognised section so stale bookmarks and typos degrade gracefully", () => {
    expect(parseRetentionSection("danger")).toBe("policy");
    expect(parseRetentionSection("")).toBe("policy");
  });
});

describe("buildWorkQueryKeys.projects.retentionSettings — cache key (BLD-RETENTION-C5-006)", () => {
  it("produces a deterministic key including the projectId so queries for different projects do not collide", () => {
    const key1 = buildWorkQueryKeys.projects.retentionSettings(1);
    const key2 = buildWorkQueryKeys.projects.retentionSettings(2);
    expect(key1).not.toEqual(key2);
  });

  it("contains the string 'retention-settings' so the cache key is identifiable in DevTools", () => {
    const key = buildWorkQueryKeys.projects.retentionSettings(42);
    expect(key.some((seg) => seg === "retention-settings")).toBe(true);
  });

  it("is stable — calling twice with the same projectId returns the same serialised key", () => {
    expect(JSON.stringify(buildWorkQueryKeys.projects.retentionSettings(5))).toBe(
      JSON.stringify(buildWorkQueryKeys.projects.retentionSettings(5)),
    );
  });
});
