import { describe, it, expect } from "vitest";
import { isBranchScoped, isOrgWide } from "@/lib/db/branch-filter";
import type { BranchContext } from "@/lib/db/branch-filter";

// branch-filter.ts is marked "server-only" — that import is mocked in tests/setup.ts.
// branchIdFilter and pushBranchAssigneeFilter use Drizzle SQL helpers / DB calls
// and are covered by integration tests instead.

describe("isBranchScoped", () => {
  it("returns true for BRANCH_MANAGER with a valid branchId", () => {
    const ctx: BranchContext = { role: "BRANCH_MANAGER", branchId: 1, userId: "u1" };
    expect(isBranchScoped(ctx)).toBe(true);
  });

  it("returns true for BRANCH_HR with a valid branchId", () => {
    const ctx: BranchContext = { role: "BRANCH_HR", branchId: 2, userId: "u2" };
    expect(isBranchScoped(ctx)).toBe(true);
  });

  it("returns false for CEO regardless of branchId", () => {
    const ctx: BranchContext = { role: "CEO", branchId: 1, userId: "u3" };
    expect(isBranchScoped(ctx)).toBe(false);
  });

  it("returns false for HR regardless of branchId", () => {
    const ctx: BranchContext = { role: "HR", branchId: 5, userId: "u4" };
    expect(isBranchScoped(ctx)).toBe(false);
  });

  it("returns false for BRANCH_MANAGER when branchId is null", () => {
    const ctx: BranchContext = { role: "BRANCH_MANAGER", branchId: null, userId: "u5" };
    expect(isBranchScoped(ctx)).toBe(false);
  });

  it("returns false for BRANCH_HR when branchId is null", () => {
    const ctx: BranchContext = { role: "BRANCH_HR", branchId: null, userId: "u6" };
    expect(isBranchScoped(ctx)).toBe(false);
  });

  it("returns false for SALES role", () => {
    const ctx: BranchContext = { role: "SALES", branchId: 3, userId: "u7" };
    expect(isBranchScoped(ctx)).toBe(false);
  });

  it("returns false for an unknown role", () => {
    const ctx: BranchContext = { role: "UNKNOWN_ROLE", branchId: 1, userId: "u8" };
    expect(isBranchScoped(ctx)).toBe(false);
  });
});

describe("isOrgWide", () => {
  it("returns true for CEO", () => {
    const ctx: BranchContext = { role: "CEO", branchId: null, userId: "u1" };
    expect(isOrgWide(ctx)).toBe(true);
  });

  it("returns true for HR", () => {
    const ctx: BranchContext = { role: "HR", branchId: null, userId: "u2" };
    expect(isOrgWide(ctx)).toBe(true);
  });

  it("returns true for ADMIN", () => {
    const ctx: BranchContext = { role: "ADMIN", branchId: null, userId: "u3" };
    expect(isOrgWide(ctx)).toBe(true);
  });

  it("returns false for BRANCH_MANAGER", () => {
    const ctx: BranchContext = { role: "BRANCH_MANAGER", branchId: 1, userId: "u4" };
    expect(isOrgWide(ctx)).toBe(false);
  });

  it("returns false for SALES", () => {
    const ctx: BranchContext = { role: "SALES", branchId: null, userId: "u5" };
    expect(isOrgWide(ctx)).toBe(false);
  });
});
