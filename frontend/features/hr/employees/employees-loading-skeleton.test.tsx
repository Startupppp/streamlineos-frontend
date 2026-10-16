import { act, fireEvent, render, screen } from "@testing-library/react";
import { EmployeesGridSkeleton } from "./employees-loading-skeleton";

/** UX-16: the directory skeleton never said it was late and offered no way out. */
describe("EmployeesGridSkeleton", () => {
  afterEach(() => jest.useRealTimers());

  it("turns into Still loading / Try again after 10s when a retry is wired", () => {
    jest.useFakeTimers();
    const onRetry = jest.fn();
    render(<EmployeesGridSkeleton count={2} onStalledRetry={onRetry} />);
    expect(screen.queryByText(/still loading employees/i)).not.toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("stays a plain skeleton without a retry", () => {
    jest.useFakeTimers();
    render(<EmployeesGridSkeleton count={2} />);
    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    expect(screen.queryByText(/still loading/i)).not.toBeInTheDocument();
  });
});
