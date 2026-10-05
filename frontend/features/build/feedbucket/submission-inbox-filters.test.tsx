import { act, fireEvent, render, screen } from "@testing-library/react";
import { SubmissionInboxFilters } from "./submission-inbox-filters";

const mockClearAll = jest.fn();

jest.mock("@/components/ui/user-combobox", () => ({
  UserCombobox: () => <button type="button">Any owner</button>,
}));

jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel} />
  ),
}));

const VALUES = {
  status: null,
  type: null,
  linked: null,
  duplicate: null,
  assigneeId: null,
  search: null,
  from: null,
  to: null,
} as const;

describe("SubmissionInboxFilters", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockClearAll.mockClear();
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  function advance(milliseconds = 300) {
    act(() => jest.advanceTimersByTime(milliseconds));
  }

  it("uses the shared responsive toolbar with readable direct select widths", () => {
    const { container } = render(
      <SubmissionInboxFilters values={VALUES} onChange={jest.fn()} onClearAll={mockClearAll} />,
    );

    const status = screen.getByRole("combobox", { name: "Filter by status" });
    const type = screen.getByRole("combobox", { name: "Filter by type" });
    const linked = screen.getByRole("combobox", { name: "Filter by ticket link" });

    for (const trigger of [status, type, linked]) {
      expect(trigger).toHaveClass("w-full", "min-w-0", "md:w-fit");
    }

    expect(container.querySelector('[data-slot="build-list-toolbar"]')).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Filters/ })).toBeInTheDocument();
    expect(status).toHaveClass("md:min-w-40", "md:max-w-80");
    expect(type).toHaveClass("md:min-w-40", "md:max-w-80");
    expect(linked).toHaveClass("md:min-w-40", "md:max-w-80");
    expect(status).not.toHaveClass("w-[130px]");
    expect(type).not.toHaveClass("w-[120px]");
    expect(linked).not.toHaveClass("w-[130px]");
  });

  it("publishes a trimmed search only after 300ms", () => {
    const onChange = jest.fn();
    render(<SubmissionInboxFilters values={VALUES} onChange={onChange} onClearAll={mockClearAll} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search submissions" }), { target: { value: "  new search  " } });
    advance(299);
    expect(onChange).not.toHaveBeenCalled();
    advance(1);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("search", "new search");
  });

  it("publishes whitespace as a null search after the debounce", () => {
    const onChange = jest.fn();
    render(<SubmissionInboxFilters values={{ ...VALUES, search: "old" }} onChange={onChange} onClearAll={mockClearAll} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search submissions" }), { target: { value: "   " } });
    advance();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("search", null);
  });

  it("reflects an incoming Back search without writing the previous search over it", () => {
    const onChange = jest.fn();
    const view = render(<SubmissionInboxFilters values={{ ...VALUES, search: "new" }} onChange={onChange} onClearAll={mockClearAll} />);
    view.rerender(<SubmissionInboxFilters values={{ ...VALUES, search: "old" }} onChange={onChange} onClearAll={mockClearAll} />);
    expect(screen.getByRole("searchbox", { name: "Search submissions" })).toHaveValue("old");
    advance(600);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("cancels pending typing when the incoming search is externally cleared", () => {
    const onChange = jest.fn();
    const view = render(<SubmissionInboxFilters values={{ ...VALUES, search: "old" }} onChange={onChange} onClearAll={mockClearAll} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search submissions" }), { target: { value: "pending" } });
    advance(200);
    view.rerender(<SubmissionInboxFilters values={VALUES} onChange={onChange} onClearAll={mockClearAll} />);
    expect(screen.getByRole("searchbox", { name: "Search submissions" })).toHaveValue("");
    advance(600);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("preserves newer typing when its own earlier search is acknowledged", () => {
    const onChange = jest.fn();
    const view = render(<SubmissionInboxFilters values={VALUES} onChange={onChange} onClearAll={mockClearAll} />);
    const input = screen.getByRole("searchbox", { name: "Search submissions" });
    fireEvent.change(input, { target: { value: "first" } });
    advance();
    expect(onChange).toHaveBeenCalledWith("search", "first");
    fireEvent.change(input, { target: { value: "newer" } });
    advance(100);
    view.rerender(<SubmissionInboxFilters values={{ ...VALUES, search: "first" }} onChange={onChange} onClearAll={mockClearAll} />);
    expect(input).toHaveValue("newer");
    advance(300);
    expect(onChange.mock.calls).toEqual([["search", "first"], ["search", "newer"]]);
  });

  it("cancels pending typing when Back restores another nonblank search", () => {
    const onChange = jest.fn();
    const view = render(<SubmissionInboxFilters values={{ ...VALUES, search: "current" }} onChange={onChange} onClearAll={mockClearAll} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search submissions" }), { target: { value: "pending" } });
    advance(200);
    view.rerender(<SubmissionInboxFilters values={{ ...VALUES, search: "history" }} onChange={onChange} onClearAll={mockClearAll} />);
    advance(600);
    expect(screen.getByRole("searchbox", { name: "Search submissions" })).toHaveValue("history");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("waits for its outstanding write before publishing the newest draft", () => {
    const onChange = jest.fn();
    const view = render(<SubmissionInboxFilters values={VALUES} onChange={onChange} onClearAll={mockClearAll} />);
    const input = screen.getByRole("searchbox", { name: "Search submissions" });
    fireEvent.change(input, { target: { value: "first" } });
    advance();
    fireEvent.change(input, { target: { value: "second" } });
    advance();
    fireEvent.change(input, { target: { value: "third" } });
    expect(onChange.mock.calls).toEqual([["search", "first"]]);
    view.rerender(<SubmissionInboxFilters values={{ ...VALUES, search: "first" }} onChange={onChange} onClearAll={mockClearAll} />);
    expect(input).toHaveValue("third");
    advance();
    expect(onChange.mock.calls).toEqual([["search", "first"], ["search", "third"]]);
    view.rerender(<SubmissionInboxFilters values={{ ...VALUES, search: "third" }} onChange={onChange} onClearAll={mockClearAll} />);
    advance();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("clears through the real search control without later publishing the abandoned draft", () => {
    const onChange = jest.fn();
    render(<SubmissionInboxFilters values={{ ...VALUES, search: "current" }} onChange={onChange} onClearAll={mockClearAll} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search submissions" }), { target: { value: "pending" } });
    advance(200);
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("searchbox", { name: "Search submissions" })).toHaveValue("");
    advance(600);
    expect(onChange.mock.calls).toEqual([["search", null]]);
  });

  it("cancels the superseded keystroke and writes only the final draft", () => {
    const onChange = jest.fn();
    render(<SubmissionInboxFilters values={VALUES} onChange={onChange} onClearAll={mockClearAll} />);
    const input = screen.getByRole("searchbox", { name: "Search submissions" });
    fireEvent.change(input, { target: { value: "first" } });
    advance(200);
    fireEvent.change(input, { target: { value: "final" } });
    advance(299);
    expect(onChange).not.toHaveBeenCalled();
    advance(1);
    expect(onChange.mock.calls).toEqual([["search", "final"]]);
  });

  it("does not repeat an identical pending write when the callback identity changes", () => {
    const onChange = jest.fn();
    const replacement = jest.fn();
    const view = render(<SubmissionInboxFilters values={VALUES} onChange={onChange} onClearAll={mockClearAll} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search submissions" }), { target: { value: "same" } });
    advance();
    expect(onChange.mock.calls).toEqual([["search", "same"]]);
    view.rerender(<SubmissionInboxFilters values={VALUES} onChange={replacement} onClearAll={mockClearAll} />);
    advance(600);
    expect(replacement).not.toHaveBeenCalled();
  });

  it("cancels a pending search on unmount", () => {
    const onChange = jest.fn();
    const view = render(<SubmissionInboxFilters values={VALUES} onChange={onChange} onClearAll={mockClearAll} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search submissions" }), { target: { value: "abandoned" } });
    advance(200);
    view.unmount();
    advance(600);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("Clear all cancels pending search and delegates one batch clear", () => {
    const onChange = jest.fn();
    const view = render(<SubmissionInboxFilters values={{ ...VALUES, search: "current", status: "open" }} onChange={onChange} onClearAll={mockClearAll} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search submissions" }), { target: { value: "pending" } });
    advance(200);
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(mockClearAll).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
    view.rerender(<SubmissionInboxFilters values={VALUES} onChange={onChange} onClearAll={mockClearAll} />);
    advance(600);
    expect(screen.getByRole("searchbox", { name: "Search submissions", hidden: true })).toHaveValue("");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clears all and still allows typing a new search when the initial search was already empty", () => {
    const onChange = jest.fn();
    render(<SubmissionInboxFilters values={{ ...VALUES, status: "open" }} onChange={onChange} onClearAll={mockClearAll} />);
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    jest.clearAllMocks();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search submissions", hidden: true }), { target: { value: "hello" } });
    advance();
    expect(onChange).toHaveBeenCalledWith("search", "hello");
  });

  it("does not republish cleared search while the Clear all acknowledgement takes longer than 300ms", () => {
    const onChange = jest.fn();
    const view = render(<SubmissionInboxFilters values={{ ...VALUES, search: "old", status: "open" }} onChange={onChange} onClearAll={mockClearAll} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search submissions" }), { target: { value: "pending" } });
    advance(200);
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(mockClearAll).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
    advance(900);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("searchbox", { name: "Search submissions", hidden: true })).toHaveValue("");
    view.rerender(<SubmissionInboxFilters values={VALUES} onChange={onChange} onClearAll={mockClearAll} />);
    advance(600);
    expect(onChange).not.toHaveBeenCalled();
  });
});
