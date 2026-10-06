import { renderHook } from "@testing-library/react";
import {
  TICKET_SEARCH_QUERY_MAX,
  useDuplicateTitleWarning,
} from "./use-duplicate-title-warning";

const mockUseTicketSearch = jest.fn<unknown, unknown[]>(() => ({ data: [] }));
const mockUseDebouncedValue = jest.fn((value: string) => value);

jest.mock("@/hooks/api/build/ticket-search", () => ({
  useTicketSearch: (...args: unknown[]) => mockUseTicketSearch(...args),
}));
jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (value: string) => mockUseDebouncedValue(value),
}));

describe("useDuplicateTitleWarning — search must not fire over-limit titles", () => {
  beforeEach(() => {
    mockUseTicketSearch.mockClear();
  });

  it("does not enable ticket search when the title exceeds the API query max", () => {
    const over = "a".repeat(TICKET_SEARCH_QUERY_MAX + 1);
    renderHook(() => useDuplicateTitleWarning(over, 29));
    expect(mockUseTicketSearch).toHaveBeenCalledWith(
      over.trim().toLowerCase(),
      expect.objectContaining({ enabled: false }),
    );
  });

  it("enables ticket search for a title at the API query max", () => {
    const atLimit = "a".repeat(TICKET_SEARCH_QUERY_MAX);
    renderHook(() => useDuplicateTitleWarning(atLimit, 29));
    expect(mockUseTicketSearch).toHaveBeenCalledWith(
      atLimit.trim().toLowerCase(),
      expect.objectContaining({ enabled: true }),
    );
  });
});
