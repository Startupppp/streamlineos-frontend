import { renderHook } from "@testing-library/react";
import { buildProductReturnParam } from "./product-return-href";
import { useProductReturn } from "./use-product-return";

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockSearch = "";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

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
