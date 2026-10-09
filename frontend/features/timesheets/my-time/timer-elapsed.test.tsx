import { act, render, screen } from "@testing-library/react";
import { TimerElapsed } from "./timer-panel";

it("ticks while running and resets from a new keyed server snapshot", () => {
  jest.useFakeTimers();
  const { rerender } = render(<TimerElapsed key="1:RUNNING:5" base={5} running />);
  expect(screen.getByText("00:00:05")).toBeInTheDocument();

  act(() => jest.advanceTimersByTime(2_000));
  expect(screen.getByText("00:00:07")).toBeInTheDocument();

  rerender(<TimerElapsed key="1:PAUSED:12" base={12} running={false} />);
  expect(screen.getByText("00:00:12")).toBeInTheDocument();
  jest.useRealTimers();
});
