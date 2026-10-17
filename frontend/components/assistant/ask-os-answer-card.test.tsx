import { render, screen, within } from "@testing-library/react";
import {
  AskOsEvidenceCard,
  AskOsLimitCard,
  AskOsPlanCard,
  AskOsReceiptCard,
} from "./ask-os-answer-card";
import type { AskOsActionReceipt } from "./ask-os-directive-schema";

describe("AskOsEvidenceCard", () => {
  it("lists each source with its own status, owner, scope and as-of time", () => {
    render(
      <AskOsEvidenceCard
        directive={{
          kind: "evidence",
          sources: [
            {
              owner: "Build",
              label: "Open bugs in Mobile app",
              status: "ok",
              scope: "This project",
              asOf: "2026-10-09T09:00:00.000Z",
              href: "/build/42/issues?type=BUG",
            },
            { owner: "Documents", label: "Leave policy", status: "degraded", excerpt: "Up to 20 days" },
            { owner: "CRM", label: "Acme lead", status: "denied" },
          ],
        }}
      />,
    );

    const rows = within(screen.getByRole("region", { name: "Sources" })).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Available");
    expect(rows[0]).toHaveTextContent(/Build · This project · as of/);
    expect(rows[1]).toHaveTextContent("Degraded");
    expect(rows[1]).toHaveTextContent("Up to 20 days");
    expect(rows[2]).toHaveTextContent("No access");
  });

  it("links only the sources that carry an href and never invents one", () => {
    render(
      <AskOsEvidenceCard
        directive={{
          kind: "evidence",
          sources: [
            { owner: "Build", label: "Linked source", status: "ok", href: "/build/42" },
            { owner: "Documents", label: "Unlinked source", status: "ok" },
          ],
        }}
      />,
    );

    expect(screen.getByRole("link", { name: "Linked source" })).toHaveAttribute("href", "/build/42");
    expect(screen.queryByRole("link", { name: "Unlinked source" })).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("opens an external citation in a new tab without an opener", () => {
    render(
      <AskOsEvidenceCard
        directive={{
          kind: "evidence",
          sources: [{ owner: "Gmail", label: "Thread", status: "ok", href: "https://mail.example/t/1" }],
        }}
      />,
    );

    const link = screen.getByRole("link", { name: "Thread" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});

describe("AskOsPlanCard", () => {
  it("shows every step in order with its own status", () => {
    render(
      <AskOsPlanCard
        directive={{
          kind: "action-plan",
          steps: [
            { index: 1, title: "Reply to Acme", status: "completed" },
            { index: 2, title: "Schedule follow-up", status: "proposed" },
            { index: 3, title: "Update the lead", status: "pending" },
          ],
        }}
      />,
    );

    const steps = within(screen.getByRole("region", { name: "Plan" })).getAllByRole("listitem");
    expect(steps.map((step) => step.textContent)).toEqual([
      "1.Reply to AcmeDone",
      "2.Schedule follow-upAwaiting confirmation",
      "3.Update the leadPending",
    ]);
  });
});

describe("AskOsLimitCard", () => {
  it("states the honest reason and offers the manual route", () => {
    render(
      <AskOsLimitCard
        directive={{
          kind: "capability-limit",
          reason: "unsupported",
          summary: "Payroll amounts can't be changed through the assistant.",
          href: "/payroll/runs",
        }}
      />,
    );

    expect(screen.getByText("Not available through the assistant")).toBeInTheDocument();
    expect(screen.getByText("Payroll amounts can't be changed through the assistant.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open the workflow" })).toHaveAttribute("href", "/payroll/runs");
  });

  it("offers no link when the server gave no authorized route", () => {
    render(
      <AskOsLimitCard
        directive={{ kind: "capability-limit", reason: "denied", summary: "You can't view payroll." }}
      />,
    );

    expect(screen.getByText("You don't have access to this")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("AskOsReceiptCard", () => {
  const base: AskOsActionReceipt = {
    proposalId: 11,
    action: "build.ticket.updateStatus",
    status: "committed",
    summary: "Moved STRE-7 to Done",
    href: "/build/42/tickets/STRE-7",
    changedFields: ["status", "assignee"],
    at: "2026-10-09T09:05:00.000Z",
  };

  it.each([
    ["committed", "Done"],
    ["already-completed", "Already completed"],
    ["failed", "Failed"],
    ["conflicted", "Changed since proposed"],
    ["expired", "Expired"],
    ["denied", "Not allowed"],
  ] as const)("labels a %s receipt as %s", (status, label) => {
    render(<AskOsReceiptCard receipt={{ ...base, status }} />);

    expect(screen.getByRole("region", { name: `Action result: ${label}` })).toBeInTheDocument();
  });

  it("shows the changed fields, the time and the authorized result link", () => {
    render(<AskOsReceiptCard receipt={base} />);

    expect(screen.getByText("Changed: status, assignee")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open result" })).toHaveAttribute(
      "href",
      "/build/42/tickets/STRE-7",
    );
    expect(document.querySelector("time")).toHaveAttribute("dateTime", base.at);
  });

  it("never labels a conflicted receipt as done", () => {
    render(<AskOsReceiptCard receipt={{ ...base, status: "conflicted", href: undefined }} />);

    expect(screen.queryByText("Done")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
