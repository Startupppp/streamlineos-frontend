import { act, fireEvent, render, screen } from "@testing-library/react";
import { TicketPickerDialog } from "./ticket-picker-dialog";

jest.mock("@/hooks/api/build", () => ({
  useTicketSearch: jest.fn(),
}));

const { useTicketSearch } = jest.requireMock<{
  useTicketSearch: jest.Mock;
}>("@/hooks/api/build");

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
  useTicketSearch.mockReset();
  useTicketSearch.mockReturnValue({ data: [], isLoading: false });
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
