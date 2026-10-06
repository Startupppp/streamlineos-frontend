import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { atViewport } from "@/test-utils/viewport";

beforeEach(() => {
  jest.useFakeTimers({
    doNotFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame", "performance", "queueMicrotask", "nextTick"],
  });
  jest.setSystemTime(new Date("2026-10-06T12:00:00"));
});

afterEach(() => {
  jest.useRealTimers();
});

describe("DateRangePicker in mobile filters", () => {
  let restoreViewport: () => void;

  beforeEach(() => {
    restoreViewport = atViewport("mobile");
  });

  afterEach(() => {
    cleanup();
    restoreViewport();
  });

  it("keeps calendar days pointer eligible above the active drawer", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <ResponsivePopover>
        <ResponsivePopoverTrigger asChild>
          <Button>Filters</Button>
        </ResponsivePopoverTrigger>
        <ResponsivePopoverContent title="Filters">
          <DateRangePicker from="2026-10-01" onChange={onChange} />
        </ResponsivePopoverContent>
      </ResponsivePopover>,
    );
    await user.click(screen.getByRole("button", { name: "Filters" }));
    const drawer = await screen.findByRole("dialog", { name: "Filters" });
    fireEvent.click(within(drawer).getByRole("button", { name: "Oct 1, 2026 – …" }));
    const day = (await screen.findAllByRole("gridcell", { name: "2", hidden: true }))[0];

    expect(getComputedStyle(day).pointerEvents).not.toBe("none");
    await user.click(day);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ from: "2026-10-01", to: "2026-10-02" });
    expect(drawer).toHaveAttribute("data-state", "open");
  });

  it("returns focus to the picker after Escape and leaves the filters drawer open", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <ResponsivePopover>
        <ResponsivePopoverTrigger asChild>
          <Button>Filters</Button>
        </ResponsivePopoverTrigger>
        <ResponsivePopoverContent title="Filters">
          <DateRangePicker from="2026-10-01" onChange={onChange} />
        </ResponsivePopoverContent>
      </ResponsivePopover>,
    );
    await user.click(screen.getByRole("button", { name: "Filters" }));
    const drawer = await screen.findByRole("dialog", { name: "Filters" });
    const trigger = within(drawer).getByRole("button", { name: "Oct 1, 2026 – …" });
    trigger.focus();
    await user.keyboard("{Enter}");
    const day = (await screen.findAllByRole("gridcell", { name: "2" }))[0];
    await waitFor(() => expect(day.closest('[role="dialog"]')?.contains(document.activeElement)).toBe(true));
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("gridcell")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(drawer).toHaveAttribute("data-state", "open");
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("standalone DateRangePicker", () => {
  it("selects a start and end through the retained controlled range callback", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const { rerender } = render(<DateRangePicker onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Pick a date range" }));
    await user.click((await screen.findAllByRole("gridcell", { name: "1" }))[0]);
    expect(onChange).toHaveBeenNthCalledWith(1, { from: "2026-10-01", to: "" });

    rerender(<DateRangePicker from="2026-10-01" onChange={onChange} />);
    await user.click(screen.getAllByRole("gridcell", { name: "2" })[0]);
    expect(onChange).toHaveBeenNthCalledWith(2, { from: "2026-10-01", to: "2026-10-02" });
    expect(onChange).toHaveBeenCalledTimes(2);

    rerender(<DateRangePicker from="2026-10-01" to="2026-10-02" onChange={onChange} />);
    await user.keyboard("{Escape}");
    const trigger = await screen.findByRole("button", { name: "Oct 1 – Oct 2, 2026" });
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("opens by keyboard and keeps focus inside the calendar until Escape", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<DateRangePicker onChange={onChange} placeholder="Release dates" />);
    const trigger = screen.getByRole("button", { name: "Release dates" });
    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard("{Enter}");
    const calendar = await screen.findByRole("dialog");
    await waitFor(() => expect(calendar.contains(document.activeElement)).toBe(true));
    await user.tab();
    expect(calendar.contains(document.activeElement)).toBe(true);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps a disabled picker closed and preserves placeholder and custom class props", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<DateRangePicker disabled placeholder="Release dates" className="filter-dates" onChange={onChange} />);
    const trigger = screen.getByRole("button", { name: "Release dates" });
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveClass("filter-dates");
    await user.click(trigger);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
