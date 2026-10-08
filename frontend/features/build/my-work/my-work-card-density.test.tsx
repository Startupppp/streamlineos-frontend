import { render, screen } from "@testing-library/react";
import { WorkItemRow } from "./my-work-rows";

jest.mock("next/link", () => {
  const LinkMock = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  );
  LinkMock.displayName = "Link";
  return LinkMock;
});

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/features/build/ticket-details/build-ticket-detail-url", () => ({
  getMyWorkTicketHref: (_pid: number, key: string, num: number, ret: string) =>
    `/build/${_pid}/tickets/${key}-${num}?returnTo=${encodeURIComponent(ret)}`,
}));

function makeItem(overrides?: Partial<{
  id: number;
  projectId: number | null;
  projectKey: string;
  projectName: string;
  ticketNumber: number;
  title: string;
  status: string;
  priority: string | null;
  type: string;
  dueDate: string | null;
}>) {
  return {
    id: 1,
    projectId: 1,
    projectKey: "AL",
    projectName: "Alpha",
    ticketNumber: 1,
    title: "Test Ticket",
    status: "TODO",
    priority: "MEDIUM" as const,
    type: "TASK",
    dueDate: null,
    ...overrides,
  };
}

describe("WorkItemRow — compact density keeps useful identity", () => {
  it("comfortable density (default) renders the project and type metadata", () => {
    render(
      <WorkItemRow item={makeItem()} returnHref="/build/my-work" />,
    );
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("TASK")).toBeInTheDocument();
  });

  it("compact density keeps the project and ticket identity but hides optional type", () => {
    render(
      <WorkItemRow item={makeItem()} returnHref="/build/my-work" density="compact" />,
    );
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("AL-1")).toBeInTheDocument();
    expect(screen.queryByText("TASK")).not.toBeInTheDocument();
  });

  it("compact density still renders the ticket title", () => {
    render(
      <WorkItemRow
        item={makeItem({ title: "Important Task" })}
        returnHref="/build/my-work"
        density="compact"
      />,
    );
    expect(screen.getByText("Important Task")).toBeInTheDocument();
  });

  it("compact density exposes the status through a labelled icon", () => {
    render(
      <WorkItemRow item={makeItem({ status: "IN_PROGRESS" })} returnHref="/build/my-work" density="compact" />,
    );
    expect(screen.getByRole("img", { name: "Status: In Progress" })).toBeInTheDocument();
  });
});

describe("WorkItemRow — blocked signal appears when ticket has blocking relations", () => {
  it("applies data-blocked attribute when isBlocked is true", () => {
    const { container } = render(
      <WorkItemRow item={makeItem()} returnHref="/build/my-work" isBlocked />,
    );
    expect(container.querySelector("[data-blocked]")).not.toBeNull();
  });

  it("does not apply data-blocked attribute when isBlocked is false", () => {
    const { container } = render(
      <WorkItemRow item={makeItem()} returnHref="/build/my-work" isBlocked={false} />,
    );
    expect(container.querySelector("[data-blocked]")).toBeNull();
  });

  it("blocked row has left border danger class", () => {
    const { container } = render(
      <WorkItemRow item={makeItem()} returnHref="/build/my-work" isBlocked />,
    );
    const blockedDiv = container.querySelector("[data-blocked]");
    expect(blockedDiv?.className).toMatch(/border-status-danger/);
  });
});

describe("WorkItemRow — overdue signal appears when dueDate is past and status not completed", () => {
  it("applies data-overdue attribute when isOverdue is true", () => {
    const { container } = render(
      <WorkItemRow item={makeItem()} returnHref="/build/my-work" isOverdue />,
    );
    expect(container.querySelector("[data-overdue]")).not.toBeNull();
  });

  it("does not apply data-overdue attribute when isOverdue is false", () => {
    const { container } = render(
      <WorkItemRow item={makeItem()} returnHref="/build/my-work" isOverdue={false} />,
    );
    expect(container.querySelector("[data-overdue]")).toBeNull();
  });

  it("overdue row has left border warning class", () => {
    const { container } = render(
      <WorkItemRow item={makeItem()} returnHref="/build/my-work" isOverdue />,
    );
    const overdueDiv = container.querySelector("[data-overdue]");
    expect(overdueDiv?.className).toMatch(/border-status-warning/);
  });
});

describe("WorkItemRow — inaccessible field hidden (null-project path)", () => {
  it("null-project row hides project metadata since project is inaccessible", () => {
    render(
      <WorkItemRow
        item={makeItem({ projectId: null, projectName: "Deleted Project" })}
        returnHref="/build/my-work"
      />,
    );
    expect(screen.queryByText("Deleted Project")).not.toBeInTheDocument();
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
  });
});
