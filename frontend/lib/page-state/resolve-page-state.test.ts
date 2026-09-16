import { ApiError } from "@/lib/api-envelope";
import { resolvePageState, pageStateFromError } from "./resolve-page-state";

const idle = { isLoading: false, isError: false } as const;

describe("resolvePageState", () => {
  it("claims nothing while access is still in flight", () => {
    expect(resolvePageState({ ...idle, access: "loading", isLoading: false }))
      .toEqual({ kind: "loading" });
  });

  it("answers module before permission, because ModuleGuard runs before PermissionGuard", () => {
    const state = resolvePageState({
      ...idle,
      access: "denied",
      module: {
        status: "unavailable",
        moduleKey: "payroll",
        reason: "not-in-plan",
        upgradePath: "/settings/billing",
      },
    });

    expect(state).toEqual({
      kind: "plan-required",
      moduleKey: "payroll",
      upgradePath: "/settings/billing",
    });
  });

  it("separates an individually denied user from an organization that never enabled it", () => {
    const denied = resolvePageState({
      ...idle,
      access: "granted",
      module: { status: "unavailable", moduleKey: "hr", reason: "user-denied", upgradePath: null },
    });
    const disabled = resolvePageState({
      ...idle,
      access: "granted",
      module: { status: "unavailable", moduleKey: "hr", reason: "org-disabled", upgradePath: null },
    });

    expect(denied.kind).toBe("module-denied");
    expect(disabled.kind).toBe("module-disabled");
  });

  it("does not read a denied query's flags, so denial never renders as emptiness", () => {
    const state = resolvePageState({
      access: "denied",
      permission: "hr:employees:view",
      isLoading: false,
      isError: false,
      isEmpty: true,
    });

    expect(state).toEqual({ kind: "denied", permission: "hr:employees:view" });
  });

  it("treats a 402 module denial as its reason rather than as a generic failure", () => {
    const error = new ApiError("nope", 402, "MODULE_NOT_ENABLED", {
      moduleKey: "feedbucket",
      reason: "org-disabled",
      upgradePath: null,
    });

    expect(resolvePageState({ ...idle, access: "granted", isError: true, error }))
      .toEqual({ kind: "module-disabled", moduleKey: "feedbucket" });
  });

  it("renders a permission denial from a 403 instead of Something went wrong", () => {
    const error = new ApiError("nope", 403);
    expect(resolvePageState({ ...idle, access: "granted", isError: true, error }).kind)
      .toBe("denied");
  });

  it("degrades a malformed denial payload rather than throwing inside a render", () => {
    const error = new ApiError("nope", 402, "MODULE_NOT_ENABLED", { moduleKey: 7 });
    expect(pageStateFromError(error)).toEqual({ kind: "module-disabled", moduleKey: "" });
  });

  it("leaves a non-api error to the ordinary error branch", () => {
    expect(pageStateFromError(new Error("boom"))).toBeNull();
  });
});
