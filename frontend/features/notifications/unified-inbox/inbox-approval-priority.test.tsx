import { render, screen } from "@testing-library/react";
import { InboxItemCard } from "./inbox-item-card";
import type { BuildApprovalInboxItem } from "@/types/inbox";

const noop = jest.fn();

jest.mock("@/lib/utils", () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

function makeApproval(priority: string): BuildApprovalInboxItem {
  return {
    kind: "build_approval",
    id: 1,
    status: "pending",
    approvalKind: "build",
    priority,
    projectId: null,
    ticketId: null,
    dueAt: null,
    sourceModule: "build",
    actor: null,
    subject: "Deployment to production",
    timestamp: new Date("2026-09-01T10:00:00Z").toISOString(),
    isRead: false,
    deepLink: null,
    dedupKey: `approval:1:${priority}`,
  };
}

function renderApproval(priority: string) {
  return render(
    <InboxItemCard
      item={makeApproval(priority)}
      onNotificationClick={noop}
      onBroadcastClick={noop}
      onMailClick={noop}
      onApprovalClick={noop}
      onModuleTaskClick={noop}
    />,
  );
}

describe("ApprovalItemCard — priority badge visibility", () => {
  it("renders a HIGH priority badge so an elevated approval is visually distinct", () => {
    renderApproval("HIGH");
    expect(screen.getByText("HIGH")).toBeInTheDocument();
  });

  it("renders a CRITICAL priority badge so a critical approval is never silent", () => {
    renderApproval("CRITICAL");
    expect(screen.getByText("CRITICAL")).toBeInTheDocument();
  });

  it("renders no priority badge for NORMAL so routine approvals do not shout", () => {
    renderApproval("NORMAL");
    expect(screen.queryByText("NORMAL")).not.toBeInTheDocument();
  });

  it("renders no priority badge for LOW so below-average priority stays quiet", () => {
    renderApproval("LOW");
    expect(screen.queryByText("LOW")).not.toBeInTheDocument();
  });
});

describe("ApprovalItemCard — unrecognised priority renders readably without throwing", () => {
  it("renders the raw value for an unknown future priority so it is never blank", () => {
    renderApproval("URGENT_FUTURE_VALUE");
    expect(screen.getByText("URGENT_FUTURE_VALUE")).toBeInTheDocument();
  });

  it("positive: a known elevated priority still renders with the same code path", () => {
    renderApproval("HIGH");
    expect(screen.getByText("HIGH")).toBeInTheDocument();
  });
});

describe("ApprovalItemCard — priority does not displace existing fields", () => {
  it("status badge is still present alongside an elevated priority badge", () => {
    renderApproval("HIGH");
    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
  });

  it("approval-kind label is still present alongside a HIGH priority badge", () => {
    renderApproval("HIGH");
    expect(screen.getByText("Build")).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
  });

  it("due-date is rendered when dueAt is present even with a HIGH priority badge", () => {
    render(
      <InboxItemCard
        item={{
          ...makeApproval("HIGH"),
          dueAt: new Date("2026-10-01T09:00:00Z").toISOString(),
        }}
        onNotificationClick={noop}
        onBroadcastClick={noop}
        onMailClick={noop}
        onApprovalClick={noop}
        onModuleTaskClick={noop}
      />,
    );
    expect(screen.getByText(/due/i)).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
  });

  it("subject is still rendered when priority is elevated", () => {
    renderApproval("HIGH");
    expect(screen.getByText("Deployment to production")).toBeInTheDocument();
  });

  it("negative: NORMAL priority does not accidentally hide the status badge", () => {
    renderApproval("NORMAL");
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("negative: NORMAL priority does not accidentally hide the kind label", () => {
    renderApproval("NORMAL");
    expect(screen.getByText("Build")).toBeInTheDocument();
  });
});
