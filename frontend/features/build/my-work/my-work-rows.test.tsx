import { act, render, screen } from "@testing-library/react";
import { BucketSection, BUCKET_SYNC_LIMIT } from "./my-work-rows";
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
});
