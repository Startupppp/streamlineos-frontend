import { render, screen, fireEvent } from "@testing-library/react";
import { MailDailyBrief } from "./mail-daily-brief";

it("generates a brief on demand and opens its details without generating again", () => {
  const onGenerate = jest.fn();
  const onDetails = jest.fn();
  const { rerender } = render(<MailDailyBrief state={{ status: "idle" }} canAi onGenerate={onGenerate} onDetails={onDetails} />);
  fireEvent.click(screen.getByRole("button", { name: "Daily brief" }));
  expect(onGenerate).toHaveBeenCalledTimes(1);
  rerender(<MailDailyBrief state={{ status: "ready", summary: "Reply to the launch team", highlights: [], actionItems: ["Confirm launch"] }} canAi onGenerate={onGenerate} onDetails={onDetails} />);
  expect(screen.getByText("Reply to the launch team")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "View daily mail brief" }));
  expect(onDetails).toHaveBeenCalledTimes(1);
  expect(onGenerate).toHaveBeenCalledTimes(1);
});

it("does not expose AI brief controls without permission", () => {
  render(<MailDailyBrief state={{ status: "idle" }} canAi={false} onGenerate={jest.fn()} onDetails={jest.fn()} />);
  expect(screen.queryByLabelText("Daily mail brief")).toBeNull();
});

it("keeps pending copy hidden on mobile while preserving an accessible status", () => {
  render(<MailDailyBrief state={{ status: "loading" }} canAi onGenerate={jest.fn()} onDetails={jest.fn()} />);

  expect(screen.getByText("Reading inbox…")).toHaveClass("hidden", "lg:inline");
  expect(screen.getByText("Generating daily mail brief")).toHaveClass("sr-only");
  expect(screen.getByRole("button", { name: "Daily brief" })).toHaveAttribute("aria-busy", "true");
});
