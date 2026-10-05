import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BucketSection, BUCKET_SYNC_LIMIT, WorkItemRow } from "./my-work-rows";
import type { MyWorkItem } from "@/types/projects/my-work";

function makeItem(id: number): MyWorkItem {
  return {
    id,
    projectId: 1,
    projectName: "Alpha",
    projectKey: "AL",
    ticketNumber: id,
    title: `Ticket ${id}`,
    status: "TODO",
    priority: "MEDIUM",
    type: "TASK",
    dueDate: null,
  };
}

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

describe("BucketSection", () => {
  it("renders all items when count is at or below the sync limit", () => {
    const items = Array.from({ length: BUCKET_SYNC_LIMIT }, (_, i) => makeItem(i + 1));
    render(<BucketSection bucket="none" items={items} />);
    expect(screen.getAllByRole("link")).toHaveLength(BUCKET_SYNC_LIMIT);
  });

  it("renders all items after the concurrent transition fires for large lists", async () => {
    const total = BUCKET_SYNC_LIMIT + 5;
    const items = Array.from({ length: total }, (_, i) => makeItem(i + 1));
    render(<BucketSection bucket="none" items={items} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getAllByRole("link")).toHaveLength(total);
  });

  it("shows the total count in the header badge", () => {
    const items = Array.from({ length: 3 }, (_, i) => makeItem(i + 1));
    render(<BucketSection bucket="overdue" items={items} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders the bucket label for the overdue bucket", () => {
    render(<BucketSection bucket="overdue" items={[makeItem(1)]} />);
    expect(screen.getByText("Overdue")).toBeInTheDocument();
  });

  it("uses the canonical ticket URL and returns to the filtered My Work section", () => {
    render(
      <BucketSection
        bucket="none"
        items={[makeItem(81)]}
        returnHref="/build/my-work?relation=created&q=review"
      />,
    );

    expect(screen.getByRole("link", { name: /Ticket 81/i })).toHaveAttribute(
      "href",
      "/build/1/tickets/AL-81?returnTo=%2Fbuild%2Fmy-work%3Frelation%3Dcreated%26q%3Dreview",
    );
  });
});

function makeNullProjectItem() {
  return {
    id: 99,
    projectId: null as null,
    projectKey: "X",
    projectName: "Deleted Project",
    ticketNumber: 99,
    title: "Orphaned ticket",
    status: "DRAFT",
    priority: "LOW" as const,
    type: "TASK",
    dueDate: null,
  };
}

describe("WorkItemRow — null-project draft", () => {
  it("shows an unavailable label when the project has been deleted", () => {
    render(<WorkItemRow item={makeNullProjectItem()} returnHref="/build/my-work" />);
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
  });

  it("shows a delete button on null-project draft rows", () => {
    render(<WorkItemRow item={makeNullProjectItem()} returnHref="/build/my-work" />);
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("clicking delete calls the onDelete handler when provided", async () => {
    const onDelete = jest.fn();
    render(<WorkItemRow item={makeNullProjectItem()} onDelete={onDelete} returnHref="/build/my-work" />);
    await userEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("clicking delete does not throw when no onDelete handler is provided (non-owner path)", async () => {
    render(<WorkItemRow item={makeNullProjectItem()} returnHref="/build/my-work" />);
    await expect(userEvent.click(screen.getByRole("button", { name: /delete/i }))).resolves.not.toThrow();
  });

  it("null-project row does not render a navigation link", () => {
    render(<WorkItemRow item={makeNullProjectItem()} returnHref="/build/my-work" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
