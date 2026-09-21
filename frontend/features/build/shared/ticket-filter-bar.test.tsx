import { fireEvent, render, screen } from "@testing-library/react";
import { TicketFilterBar } from "./ticket-filter-bar";

const mockReplace = jest.fn();
const mockUseCycles = jest.fn(() => ({ data: [] }));
const mockUseProjectLabels = jest.fn(() => ({ data: [] }));
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  usePathname: () => "/build/tickets",
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock("next/dynamic", () => () => () => null);

// The bar's only data dependencies. Stubbing them keeps the session and query
// providers out of a test about chips and URL state.
jest.mock("@/hooks/api/build/advanced", () => ({
  useCycles: (...args: [number, Record<string, unknown>?]) => mockUseCycles(...args),
}));
jest.mock("@/hooks/api/build/projects", () => ({
  useProjectLabels: (...args: [number?, Record<string, unknown>?]) => mockUseProjectLabels(...args),
}));

/**
 * Overflow is deliberately not asserted here. It is decided by layout, jsdom
 * performs none, and an assertion that cannot fail is worse than an absent one.
 * That criterion is only holdable in a browser.
 */

function renderWith(query: string) {
  mockSearchParams = new URLSearchParams(query);
  window.history.replaceState({}, "", query ? `/build/tickets?${query}` : "/build/tickets");
  return render(
    <TicketFilterBar
      statuses={[{ name: "OPEN" }, { name: "DONE" }]}
      members={[{ id: "u1", name: "Priya", firstName: "Priya", lastName: null }]}
      sprints={[{ id: 7, name: "Sprint 7" }]}
      projectId={42}
    />,
  );
}

function lastParams(): URLSearchParams {
  const url = String(mockReplace.mock.calls.at(-1)?.[0] ?? "");
  return new URLSearchParams(url.includes("?") ? url.slice(url.indexOf("?") + 1) : "");
}

describe("ticket filter bar", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockUseCycles.mockClear();
    mockUseProjectLabels.mockClear();
    mockSearchParams = new URLSearchParams();
  });

  it("gives every active filter a dismissible chip", () => {
    renderWith("status=OPEN&priority=HIGH");

    expect(screen.getByLabelText(/remove open filter/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/remove high filter/i)).toBeInTheDocument();
  });

  it("shows no chips when nothing is filtered", () => {
    renderWith("");

    expect(screen.queryByLabelText(/remove .* filter/i)).not.toBeInTheDocument();
  });

  it("defers cycle and label reads until filter options are requested", () => {
    renderWith("");

    expect(mockUseCycles).toHaveBeenLastCalledWith(0);
    expect(mockUseProjectLabels).toHaveBeenLastCalledWith(42, {
      enabled: false,
    });

    fireEvent.click(screen.getByRole("button", { name: "Add filter" }));

    expect(mockUseCycles).toHaveBeenLastCalledWith(42);
    expect(mockUseProjectLabels).toHaveBeenLastCalledWith(42, {
      enabled: true,
    });
  });

  it("loads taxonomy names immediately when the URL already contains those filters", () => {
    renderWith("labels=3&cycle=7");

    expect(mockUseCycles).toHaveBeenLastCalledWith(42);
    expect(mockUseProjectLabels).toHaveBeenLastCalledWith(42, {
      enabled: true,
    });
  });

  it("dismissing a chip removes exactly that filter", () => {
    renderWith("status=OPEN&priority=HIGH");

    fireEvent.click(screen.getByLabelText(/remove open filter/i));

    const params = lastParams();
    expect(params.has("status")).toBe(false);
    expect(params.get("priority")).toBe("HIGH");
  });

  it("dismissing one value in a group leaves the others in place", () => {
    renderWith("status=OPEN,DONE");

    fireEvent.click(screen.getByLabelText(/remove open filter/i));

    expect(lastParams().get("status")).toBe("DONE");
  });

  it("keeps the chip's remove control reachable by its accessible name", () => {
    renderWith("status=OPEN");

    const control = screen.getByLabelText(/remove open filter/i);
    expect(control.tagName).toBe("BUTTON");
    expect(control).toHaveAttribute("type", "button");
  });
});
