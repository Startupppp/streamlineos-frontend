import { act, renderHook } from "@testing-library/react";
import { useGuardedDocumentNavigation } from "./use-guarded-document-navigation";

const mockAssign = jest.fn();
const mockRequestLeave = jest.fn((action: () => void) => action());
const originalLocation = window.location;
jest.mock("@/components/shared/dirty-state-context", () => ({ useNavigationLeave: () => mockRequestLeave }));

beforeEach(() => {
  mockAssign.mockReset();
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

  it.each(["https://outside.test/build/1", "//outside.test/build/1", "javascript:alert(1)", "/\\outside.test/build/1"])("rejects non-app targets: %s", (href) => {
    const { result } = renderHook(useGuardedDocumentNavigation);
    act(() => result.current(href));
    expect(mockAssign).not.toHaveBeenCalled();
    expect(mockRequestLeave).not.toHaveBeenCalled();
  });
});
