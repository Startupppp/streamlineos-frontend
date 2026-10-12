import { renderHook } from "@testing-library/react";
import {
  buildProductReturnParam,
  resolveProductReturnHref,
  useProductReturn,
} from "./product-return-href";

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockSearch = "";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

describe("resolveProductReturnHref — bounds the product return context", () => {
  it("accepts a product overview path and keeps its allowlisted query", () => {
    expect(
      resolveProductReturnHref("/build/managed-products/42?period=last30d&tab=evidence"),
    ).toBe("/build/managed-products/42?period=last30d&tab=evidence");
  });

  it("accepts the product directory and every product sub-route", () => {
    expect(resolveProductReturnHref("/build/managed-products")).toBe(
      "/build/managed-products",
    );
    for (const tab of [
      "feedback",
      "goals",
      "insights",
      "projects",
      "releases",
      "roadmap",
      "settings",
    ]) {
      expect(resolveProductReturnHref(`/build/managed-products/7/${tab}`)).toBe(
        `/build/managed-products/7/${tab}`,
      );
    }
  });

  it("rejects a protocol-relative value, so ?ret=//evil.example cannot navigate off-site", () => {
    expect(resolveProductReturnHref("//evil.example")).toBeNull();
    expect(resolveProductReturnHref("//evil.example/build/managed-products/42")).toBeNull();
  });

  it("rejects an absolute external URL", () => {
    expect(resolveProductReturnHref("https://evil.example/build/managed-products/42")).toBeNull();
    expect(resolveProductReturnHref("http://evil.example")).toBeNull();
  });

  it("rejects a backslash form, which some browsers normalize to a slash", () => {
    expect(resolveProductReturnHref("/\\evil.example")).toBeNull();
    expect(resolveProductReturnHref("\\\\evil.example")).toBeNull();
  });

  it("rejects a javascript scheme", () => {
    expect(resolveProductReturnHref("javascript:alert(1)")).toBeNull();
  });

  it("rejects a path outside the product routes, so the return cannot be aimed at an unrelated surface", () => {
    expect(resolveProductReturnHref("/build/my-work")).toBeNull();
    expect(resolveProductReturnHref("/settings/billing")).toBeNull();
    expect(resolveProductReturnHref("/build/managed-products/42/unknown-tab")).toBeNull();
    expect(resolveProductReturnHref("/build/managed-products/0")).toBeNull();
  });

  it("rejects a fragment, so focus cannot be redirected by the caller", () => {
    expect(resolveProductReturnHref("/build/managed-products/42#section")).toBeNull();
  });

  it("rejects an unknown query key rather than replaying it at the destination", () => {
    expect(resolveProductReturnHref("/build/managed-products/42?ret=/elsewhere")).toBeNull();
    expect(resolveProductReturnHref("/build/managed-products/42?impersonate=9")).toBeNull();
  });

  it("rejects an over-long value", () => {
    const long = `/build/managed-products/42?search=${"a".repeat(1100)}`;
    expect(resolveProductReturnHref(long)).toBeNull();
  });

  it("returns null for an absent value so callers fall back", () => {
    expect(resolveProductReturnHref(null)).toBeNull();
    expect(resolveProductReturnHref(undefined)).toBeNull();
    expect(resolveProductReturnHref("")).toBeNull();
  });

  it("round-trips what buildProductReturnParam writes, decoded once by the URL layer", () => {
    const param = buildProductReturnParam(
      "/build/managed-products/42",
      "period=last30d",
    );
    const decodedByUrlLayer = new URLSearchParams(`ret=${param}`).get("ret");
    expect(resolveProductReturnHref(decodedByUrlLayer)).toBe(
      "/build/managed-products/42?period=last30d",
    );
  });

  it("does not double-decode, so a percent-encoded filter value survives", () => {
    const param = buildProductReturnParam(
      "/build/managed-products/42",
      new URLSearchParams({ theme: "a/b" }).toString(),
    );
    const decodedByUrlLayer = new URLSearchParams(`ret=${param}`).get("ret");
    expect(resolveProductReturnHref(decodedByUrlLayer)).toBe(
      "/build/managed-products/42?theme=a%2Fb",
    );
  });
});

describe("useProductReturn — the destination restores the origin query", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockBack.mockReset();
    mockSearch = "";
  });

  it("navigates to the origin the handoff recorded, filters included", () => {
    const origin = "/build/managed-products/42?period=30d&view=grid";
    mockSearch = `ret=${buildProductReturnParam(
      "/build/managed-products/42",
      "period=30d&view=grid",
    )}`;

    const { result } = renderHook(() =>
      useProductReturn("/build/managed-products/42"),
    );
    expect(result.current.returnHref).toBe(origin);
    result.current.handleBack();
    expect(mockPush).toHaveBeenCalledWith(origin);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("falls back to history rather than trusting an off-site return value", () => {
    mockSearch = `ret=${encodeURIComponent("//evil.example")}`;

    const { result } = renderHook(() =>
      useProductReturn("/build/managed-products/42"),
    );
    expect(result.current.returnHref).toBeNull();
    result.current.handleBack();
    expect(mockPush).not.toHaveBeenCalledWith("//evil.example");
  });

  it("falls back to the product when there is no return value and no history", () => {
    const originalLength = window.history.length;
    Object.defineProperty(window.history, "length", { value: 1, configurable: true });

    const { result } = renderHook(() =>
      useProductReturn("/build/managed-products/42"),
    );
    result.current.handleBack();
    expect(mockPush).toHaveBeenCalledWith("/build/managed-products/42");

    Object.defineProperty(window.history, "length", {
      value: originalLength,
      configurable: true,
    });
  });

  it("uses history when the user arrived without a recorded origin", () => {
    Object.defineProperty(window.history, "length", { value: 4, configurable: true });

    const { result } = renderHook(() =>
      useProductReturn("/build/managed-products/42"),
    );
    result.current.handleBack();
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
