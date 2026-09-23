import { ZodError } from "zod";
import { managedProductRowContract } from "./managed-products-schema";

function baseRow(status: string) {
  return {
    id: 1,
    orgId: "org-1",
    name: "Alpha",
    key: "ALPHA",
    description: null,
    status,
    ownerId: null,
    vision: null,
    missionStatement: null,
    targetCustomer: null,
    differentiators: null,
    currentPhase: null,
    targetLaunchDate: null,
    successMetrics: null,
    ownerMembershipId: null,
    deletedAt: null,
    createdAt: "2026-09-22T00:00:00.000Z",
    updatedAt: "2026-09-22T00:00:00.000Z",
  };
}

it("accepts every managedProductStatusEnum value the backend actually sends", () => {
  for (const status of ["active", "archived"]) {
    expect(() => managedProductRowContract.parse(baseRow(status))).not.toThrow();
  }
});

it("rejects a status outside managedProductStatusEnum instead of accepting any string", () => {
  expect(() => managedProductRowContract.parse(baseRow("deleted"))).toThrow(ZodError);
});

it("parses a list row that carries status, matching the .returning() response the backend sends", () => {
  const row = managedProductRowContract.parse(baseRow("active"));
  expect(row.status).toBe("active");
});
