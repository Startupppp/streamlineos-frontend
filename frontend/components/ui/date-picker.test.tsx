import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DatePicker } from "@/components/ui/date-picker";

beforeEach(() => {
  jest.useFakeTimers({
    doNotFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "performance",
      "queueMicrotask",
      "nextTick",
    ],
  });
  jest.setSystemTime(new Date("2026-10-14T12:00:00"));
});

afterEach(() => {
  cleanup();
  jest.useRealTimers();
});

describe("DatePicker keyboard navigation", () => {
  it("focuses the selected day cell on open, not the navigation controls", async () => {
    const user = userEvent.setup();
    render(
      <DatePicker
        value="2026-10-14"
        onChange={jest.fn()}
        ariaLabel="Select date"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Select date" }));
    await screen.findByRole("dialog");
    await waitFor(() =>
      expect(document.activeElement).toHaveAttribute("role", "gridcell"),
    );
    expect(document.activeElement).toHaveAttribute("aria-selected", "true");
  });

  it("focuses today when no date is selected", async () => {
    const user = userEvent.setup();
    render(<DatePicker onChange={jest.fn()} ariaLabel="Select date" />);
    await user.click(screen.getByRole("button", { name: "Select date" }));
    await screen.findByRole("dialog");
    await waitFor(() =>
      expect(document.activeElement).toHaveAttribute("role", "gridcell"),
    );
    expect(document.activeElement?.textContent).toBe("14");
  });

  it("ArrowRight moves focus to the next day", async () => {
    const user = userEvent.setup();
    render(
      <DatePicker
        value="2026-10-14"
        onChange={jest.fn()}
        ariaLabel="Select date"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Select date" }));
    await screen.findByRole("dialog");
    await waitFor(() =>
      expect(document.activeElement).toHaveAttribute("role", "gridcell"),
    );
    await user.keyboard("{ArrowRight}");
    await waitFor(() =>
      expect(document.activeElement?.textContent).toBe("15"),
    );
    expect(document.activeElement).toHaveAttribute("role", "gridcell");
  });

  it("ArrowDown moves focus one week forward", async () => {
    const user = userEvent.setup();
    render(
      <DatePicker
        value="2026-10-07"
        onChange={jest.fn()}
        ariaLabel="Select date"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Select date" }));
    await screen.findByRole("dialog");
    await waitFor(() =>
      expect(document.activeElement).toHaveAttribute("role", "gridcell"),
    );
    await user.keyboard("{ArrowDown}");
    await waitFor(() =>
      expect(document.activeElement?.textContent).toBe("14"),
    );
    expect(document.activeElement).toHaveAttribute("role", "gridcell");
  });

  it("PageDown moves focus to the same day in the next month", async () => {
    const user = userEvent.setup();
    render(
      <DatePicker
        value="2026-10-14"
        onChange={jest.fn()}
        ariaLabel="Select date"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Select date" }));
    await screen.findByRole("dialog");
    await waitFor(() =>
      expect(document.activeElement).toHaveAttribute("role", "gridcell"),
    );
    await user.keyboard("{PageDown}");
    await waitFor(() =>
      expect(document.activeElement).toHaveAttribute("role", "gridcell"),
    );
    expect(document.activeElement?.textContent).toBe("14");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("Enter selects the focused day, calls onChange with ISO date string, and closes the picker", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(
      <DatePicker
        value="2026-10-14"
        onChange={onChange}
        ariaLabel="Select date"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Select date" }));
    await screen.findByRole("dialog");
    await waitFor(() =>
      expect(document.activeElement).toHaveAttribute("role", "gridcell"),
    );
    await user.keyboard("{ArrowRight}");
    await waitFor(() =>
      expect(document.activeElement?.textContent).toBe("15"),
    );
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("2026-10-15");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
