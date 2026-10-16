import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketPickerDialog } from "./ticket-picker-dialog";

jest.mock("@/hooks/api/build/ticket-search", () => ({
  useTicketSearch: jest.fn(),
}));

const { useTicketSearch } = jest.requireMock<{
  useTicketSearch: jest.Mock;
}>("@/hooks/api/build/ticket-search");
const mockIsMobile = jest.fn(() => false);

jest.mock("@/hooks/common/use-mobile", () => ({ useIsMobile: () => mockIsMobile() }));

function renderPicker() {
  render(
    <TicketPickerDialog
      open
      onOpenChange={jest.fn()}
      onSelect={jest.fn()}
    />,
  );
  return screen.getByRole("searchbox", { name: "Search tickets" });
}

beforeEach(() => {
  mockIsMobile.mockReturnValue(false);
  useTicketSearch.mockReset();
  useTicketSearch.mockReturnValue({ data: [], isLoading: false });
});

describe("TicketPickerDialog responsive selection", () => {
  it("uses a desktop dialog and forwards the selected ticket", () => {
    const ticket = { id: 12, title: "Fix portal", status: "OPEN", priority: "MEDIUM", ticketNumber: 12, projectId: 3, projectKey: "SOS", projectName: "Streamline", version: 1 };
    const onSelect = jest.fn();
    useTicketSearch.mockReturnValue({ data: [ticket], isLoading: false });
    render(<TicketPickerDialog open onOpenChange={jest.fn()} onSelect={onSelect} />);

    expect(screen.getByRole("dialog", { name: "Link a ticket" })).toHaveAttribute("data-slot", "dialog-content");
    fireEvent.click(screen.getByRole("button", { name: /SOS-12.*Fix portal/ }));
    expect(onSelect).toHaveBeenCalledWith(ticket);
  });

  it("opens the search and result list from the bottom on mobile", () => {
    mockIsMobile.mockReturnValue(true);
    renderPicker();
    expect(screen.getByRole("dialog", { name: "Link a ticket" })).toHaveClass("data-[state=open]:slide-in-from-bottom");
    expect(screen.getByRole("searchbox", { name: "Search tickets" })).toBeInTheDocument();
  });

  it("selects a ticket with the keyboard", async () => {
    const ticket = { id: 12, title: "Fix portal", status: "OPEN", priority: "MEDIUM", ticketNumber: 12, projectId: 3, projectKey: "SOS", projectName: "Streamline", version: 1 };
    const onSelect = jest.fn();
    useTicketSearch.mockReturnValue({ data: [ticket], isLoading: false });
    render(<TicketPickerDialog open onOpenChange={jest.fn()} onSelect={onSelect} />);

    screen.getByRole("button", { name: /SOS-12.*Fix portal/ }).focus();
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith(ticket);
  });
});

describe("TicketPickerDialog search field", () => {
  it("uses the shared SearchInput primitive rather than a hand-rolled input", () => {
    renderPicker();
    expect(document.querySelector("[data-slot='search-input']")).not.toBeNull();
  });

  it("leaves the field control at the h-9 canon", () => {
    const input = renderPicker();
    expect(input.className).toContain("h-9");
    expect(input.className).not.toContain("h-8");
  });
});

describe("TicketPickerDialog search debounce", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("does not query the backend until the typed term settles", () => {
    const input = renderPicker();

    fireEvent.change(input, { target: { value: "SOS-1" } });

    expect(useTicketSearch).toHaveBeenLastCalledWith("");

    act(() => {
      jest.advanceTimersByTime(299);
    });

    expect(useTicketSearch).toHaveBeenLastCalledWith("");

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(useTicketSearch).toHaveBeenLastCalledWith("SOS-1");
  });

  it("queries only the final term when the member keeps typing", () => {
    const input = renderPicker();

    fireEvent.change(input, { target: { value: "S" } });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    fireEvent.change(input, { target: { value: "SOS" } });
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(useTicketSearch).toHaveBeenLastCalledWith("SOS");
    expect(useTicketSearch).not.toHaveBeenCalledWith("S");
  });
});
