import { renderHook } from "@testing-library/react";
import { useMyWorkData } from "./use-my-work-data";
import { useAllWork } from "@/hooks/api/build/all-work";

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  usePathname: () => "/build/my-work",
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock("@/hooks/api/build/all-work", () => ({
  useAllWork: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
}));

const mockedUseAllWork = useAllWork as jest.Mock;

function renderWith(query: string) {
  mockSearchParams = new URLSearchParams(query);
  return renderHook(() => useMyWorkData({ activeTab: "assigned", activeView: "list" }));
}

describe("useMyWorkData Due Dates filter", () => {
  beforeEach(() => {
    mockedUseAllWork.mockClear();
  });

  it("forwards dueDateFrom and dueDateTo to the mine-scoped all-work request so the always-visible Due Dates filter chip is not a no-op", () => {
    renderWith("dueDateFrom=2026-01-01&dueDateTo=2026-01-31");

    const mineCall = mockedUseAllWork.mock.calls.find(
      ([filters]) => filters?.scope === "mine",
    );

    expect(mineCall?.[0]).toMatchObject({
      dueDateFrom: "2026-01-01",
      dueDateTo: "2026-01-31",
    });
  });

  it("omits dueDateFrom and dueDateTo from the request when the URL carries no date filter", () => {
    renderWith("");

    const mineCall = mockedUseAllWork.mock.calls.find(
      ([filters]) => filters?.scope === "mine",
    );

    expect(mineCall?.[0]).not.toHaveProperty("dueDateFrom");
    expect(mineCall?.[0]).not.toHaveProperty("dueDateTo");
  });
});
