import { render, screen } from "@testing-library/react";
import { MailInboxSummarySheet } from "./mail-inbox-summary-sheet";

it("presents a readable inbox brief without exposing redaction placeholders", () => {
  render(<MailInboxSummarySheet open onClose={jest.fn()} summaryState={{ status: "ready", summary: "You have important mail.", highlights: [{ subject: "Payment failed", fromEmail: "[REDACTED_EMAIL]", reason: "Needs attention." }, { subject: "Welcome", fromEmail: "hello@example.com", reason: "For review." }], actionItems: ["Review the payment"] }} />);
  expect(screen.getAllByRole("heading", { name: "What needs me" })).toHaveLength(2);
  expect(screen.getByText("Inbox overview")).toBeInTheDocument();
  expect(screen.getByText("Next actions")).toBeInTheDocument();
  expect(screen.queryByText("[REDACTED_EMAIL]")).toBeNull();
  expect(screen.getByText("hello@example.com")).toBeInTheDocument();
});
