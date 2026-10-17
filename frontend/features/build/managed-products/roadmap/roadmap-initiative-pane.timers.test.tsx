import { act, fireEvent, render } from "@testing-library/react";
import { RoadmapInitiativePane } from "./roadmap-initiative-pane";

const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  usePathname: () => "/build/managed-products/7/roadmap",
  useSearchParams: () => new URLSearchParams("item=3"),
}));

jest.mock("@/hooks/api/build/roadmap", () => ({
  useRoadmapItem: () => ({ data: undefined, isLoading: true }),
}));

jest.mock("@/features/build/ticket-details/ticket-detail-pane", () => ({
  TicketDetailPane: () => null,
}));

jest.mock("@/features/build/managed-products/insights/opportunity-pane", () => ({
  OpportunityPane: () => null,
}));

describe("RoadmapInitiativePane focus restoration", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReplace.mockReset();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("leaves no pending focus-restore timer behind on unmount, so closing a pane and navigating away cannot focus the old trigger", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();

    const { unmount } = render(<RoadmapInitiativePane itemId={3} />);
    act(() => {
      fireEvent.keyDown(document.body, { key: "Escape" });
    });
    expect(mockReplace).toHaveBeenCalled();
    const scheduled = jest.getTimerCount();
    expect(scheduled).toBeGreaterThan(0);

    unmount();

    expect(jest.getTimerCount()).toBeLessThan(scheduled);

    opener.remove();
  });

  it("does not focus an element that has left the document by the time the timer fires", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    const focusSpy = jest.spyOn(opener, "focus");

    render(<RoadmapInitiativePane itemId={3} />);
    opener.remove();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(focusSpy).not.toHaveBeenCalled();
    focusSpy.mockRestore();
  });
});
