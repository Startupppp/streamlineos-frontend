import "./managed-products-page.test-fixtures";
import { render, screen } from "@testing-library/react";
import { ManagedProductsPage } from "./managed-products-page";
import { resolveQueryProviderScope } from "@/components/providers/query-provider";
import {
  LOADING_SCOPE,
  UNAUTHENTICATED_SCOPE,
  authenticatedScope,
} from "@/lib/query-scope";
import {
  useManagedProducts,
  usePageState,
} from "./managed-products-page.test-fixtures";

describe("ManagedProductsPage — API denial renders sentinel, not empty list", () => {
  it("shows no-permission sentinel when usePageState returns denied so a 403 cannot be confused with an empty product list", () => {
    usePageState.mockReturnValue({
      kind: "denied",
      permission: "build:managed-products:view",
    });

    render(<ManagedProductsPage />);

    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("page-state-empty")).not.toBeInTheDocument();
  });

  it("no-permission sentinel carries the view permission key so the user knows what access is needed", () => {
    usePageState.mockReturnValue({
      kind: "denied",
      permission: "build:managed-products:view",
    });

    render(<ManagedProductsPage />);

    expect(screen.getByTestId("no-permission")).toHaveAttribute(
      "data-permission",
      "build:managed-products:view",
    );
  });

  it("calls usePageState with build:managed-products:view so a 402 module denial is classified instead of shown as an error (FE-41)", () => {
    render(<ManagedProductsPage />);

    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:managed-products:view" }),
    );
  });

  it("shows not-found sentinel when usePageState returns not-found so a 404 cross-tenant miss is not confused with an empty list", () => {
    usePageState.mockReturnValue({ kind: "not-found" });

    render(<ManagedProductsPage />);

    expect(screen.queryByTestId("page-state-empty")).not.toBeInTheDocument();
  });

  it("shows loading skeleton while access is in flight so the permission-denied flash is suppressed for permitted users (FE-42)", () => {
    usePageState.mockReturnValue({ kind: "loading" });

    render(<ManagedProductsPage />);

    expect(screen.getByTestId("page-state-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
  });

  it("passes error to usePageState so API errors are classified rather than silently dropped (FE-41)", () => {
    const apiError = { status: 403, message: "Forbidden" };
    useManagedProducts.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: apiError,
    });

    render(<ManagedProductsPage />);

    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ isError: true, error: apiError }),
    );
  });
});

describe("Query cache scope isolation — no cross-tenant cache leak (FE-20, FE-21)", () => {
  it("returns authenticated scope keyed on (orgId, userId) so different tenants get isolated cache entries", () => {
    const scope = resolveQueryProviderScope({
      status: "authenticated",
      orgId: "org-alpha",
      userId: "user-1",
    });
    expect(scope).toBe(authenticatedScope("org-alpha", "user-1"));
  });

  it("returns a different scope for a different org so tenant-A cannot read tenant-B cached managed-product rows", () => {
    const scopeA = resolveQueryProviderScope({
      status: "authenticated",
      orgId: "org-alpha",
      userId: "user-1",
    });
    const scopeB = resolveQueryProviderScope({
      status: "authenticated",
      orgId: "org-beta",
      userId: "user-1",
    });
    expect(scopeA).not.toBe(scopeB);
  });

  it("returns a different scope when the same orgId is accessed by a different user so user-A cannot see user-B personalised data", () => {
    const scopeUser1 = resolveQueryProviderScope({
      status: "authenticated",
      orgId: "org-alpha",
      userId: "user-1",
    });
    const scopeUser2 = resolveQueryProviderScope({
      status: "authenticated",
      orgId: "org-alpha",
      userId: "user-2",
    });
    expect(scopeUser1).not.toBe(scopeUser2);
  });

  it("returns LOADING_SCOPE while session loads so no stale authenticated data is served to a loading page", () => {
    const scope = resolveQueryProviderScope({
      status: "loading",
      orgId: undefined,
      userId: undefined,
    });
    expect(scope).toBe(LOADING_SCOPE);
  });

  it("returns UNAUTHENTICATED_SCOPE when signed out so authenticated cache entries are inaccessible", () => {
    const scope = resolveQueryProviderScope({
      status: "unauthenticated",
      orgId: undefined,
      userId: undefined,
    });
    expect(scope).toBe(UNAUTHENTICATED_SCOPE);
  });

  it("authenticated scope string contains both orgId and userId so it cannot collide across orgs or users", () => {
    const scope = authenticatedScope("org-x", "user-y");
    expect(scope).toContain("org-x");
    expect(scope).toContain("user-y");
  });
});
