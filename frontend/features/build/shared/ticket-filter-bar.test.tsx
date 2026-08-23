import { fireEvent, render, screen } from "@testing-library/react";
import { TicketFilterBar } from "./ticket-filter-bar";

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  usePathname: () => "/build/tickets",
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

// The bar's only data dependencies. Stubbing them keeps the session and query
// providers out of a test about chips and URL state.
jest.mock("@/hooks/api/build/advanced", () => ({
  useCycles: () => ({ data: [] }),
}));
jest.mock("@/hooks/api/build/projects", () => ({
  useProjectLabels: () => ({ data: [] }),
}));

/**
 * Overflow is deliberately not asserted here. It is decided by layout, jsdom
 * performs none, and an assertion that cannot fail is worse than an absent one.
 * That criterion is only holdable in a browser.
 */

function renderWith(query: string) {
  mockSearchParams = new URLSearchParams(query);
  return render(
    <TicketFilterBar
      statuses={[{ name: "OPEN" }, { name: "DONE" }]}
      members={[{ id: "u1", name: "Priya", firstName: "Priya", lastName: null }]}
      sprints={[{ id: 7, name: "Sprint 7" }]}
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
