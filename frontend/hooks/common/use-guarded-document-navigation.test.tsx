import { act, renderHook } from "@testing-library/react";
import { useGuardedDocumentNavigation, useGuardedSoftNavigation } from "./use-guarded-document-navigation";

const mockAssign = jest.fn();
const mockPush = jest.fn();
const mockRequestLeave = jest.fn((action: () => void) => action());
const originalLocation = window.location;
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/components/shared/dirty-state-context", () => ({ useNavigationLeave: () => mockRequestLeave }));

beforeEach(() => {
  mockAssign.mockReset();
  mockPush.mockReset();
  mockRequestLeave.mockReset().mockImplementation((action: () => void) => action());
  Object.defineProperty(window, "location", { configurable: true, value: { origin: "http://localhost", assign: mockAssign } });
});
afterEach(() => Object.defineProperty(window, "location", { configurable: true, value: originalLocation }));

describe("guarded document navigation", () => {
  it("uses a document load for the verified ticket href and preserves returnTo", () => {
    const href = "/build/1/tickets/STRE-35?returnTo=%2Fbuild%2Fmy-work%3Fview%3Dlist";
    const { result } = renderHook(useGuardedDocumentNavigation);
    act(() => result.current(href));
    expect(mockAssign).toHaveBeenCalledWith(href);
    expect(mockRequestLeave).toHaveBeenCalledTimes(1);
  });

  it("waits for the leave guard before navigating a draft detail URL", () => {
    mockRequestLeave.mockImplementation(() => {});
    const { result } = renderHook(useGuardedDocumentNavigation);
    const href = "/build/1/tickets/STRE-35?returnTo=%2Fbuild%2Fmy-work%3Fsection%3Ddrafts&draft=8";
    act(() => result.current(href));
    expect(mockAssign).not.toHaveBeenCalled();
    const approve = mockRequestLeave.mock.calls[0]?.[0];
    if (!approve) throw new Error("Expected leave approval callback");
    act(approve);
    expect(mockAssign).toHaveBeenCalledWith(href);
  });

  it("soft-navigates a My Work ticket so the pane can stay over the list", () => {
    const href = "/build/1/tickets/STRE-35?returnTo=%2Fbuild%2Fmy-work%3Fq%3DQA-070";
    const { result } = renderHook(useGuardedSoftNavigation);
    act(() => result.current(href));
    expect(mockPush).toHaveBeenCalledWith(href);
    expect(mockAssign).not.toHaveBeenCalled();
  });

  it.each(["https://outside.test/build/1", "//outside.test/build/1", "javascript:alert(1)", "/\\outside.test/build/1"])("rejects non-app targets: %s", (href) => {
    const { result } = renderHook(useGuardedDocumentNavigation);
    act(() => result.current(href));
    expect(mockAssign).not.toHaveBeenCalled();
    expect(mockRequestLeave).not.toHaveBeenCalled();
  });
});
