import { requestApprovalSchema } from "./approvals-schema";
import { DB_ENUMS } from "@/contracts/db-enums.generated";

const VALID_BASE = {
  entityId: "42",
  title: "Approve the item",
  approverId: "user-abc",
  level: "1" as const,
};

describe("requestApprovalSchema — entityType derives from DB_ENUMS.approval_entity_type", () => {
  it("DB_ENUMS.approval_entity_type contains exactly eight values", () => {
    expect(DB_ENUMS.approval_entity_type).toHaveLength(8);
  });

  it.each(DB_ENUMS.approval_entity_type)(
    "accepts catalog value: %s",
    (entityType) => {
      expect(requestApprovalSchema.safeParse({ ...VALID_BASE, entityType }).success).toBe(true);
    },
  );

  it("rejects a value absent from the catalog", () => {
    expect(
      requestApprovalSchema.safeParse({ ...VALID_BASE, entityType: "invoice" }).success,
    ).toBe(false);
  });

  it("rejects an empty string entity type", () => {
    expect(
      requestApprovalSchema.safeParse({ ...VALID_BASE, entityType: "" }).success,
    ).toBe(false);
  });

  it("accepts the two previously missing types document and client_approval", () => {
    expect(
      requestApprovalSchema.safeParse({ ...VALID_BASE, entityType: "document" }).success,
    ).toBe(true);
    expect(
      requestApprovalSchema.safeParse({ ...VALID_BASE, entityType: "client_approval" }).success,
    ).toBe(true);
  });

  it("rejects a missing entityId", () => {
    expect(
      requestApprovalSchema.safeParse({ ...VALID_BASE, entityType: "task", entityId: "" }).success,
    ).toBe(false);
  });

  it("rejects a missing approverId", () => {
    expect(
      requestApprovalSchema.safeParse({ ...VALID_BASE, entityType: "task", approverId: "" }).success,
    ).toBe(false);
  });

  it("rejects a blank title", () => {
    expect(
      requestApprovalSchema.safeParse({ ...VALID_BASE, entityType: "task", title: "   " }).success,
    ).toBe(false);
  });
});
