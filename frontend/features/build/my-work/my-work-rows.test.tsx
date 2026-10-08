import { act, createEvent, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BucketSection, BUCKET_SYNC_LIMIT, WorkItemRow } from "./my-work-rows";
import type { MyWorkItem } from "@/types/projects/my-work";

const mockPush = jest.fn();
const mockAssign = jest.fn();
const originalLocation = window.location;
const mockRequestLeave = jest.fn((action: () => void) => action());

beforeEach(() => {
  mockPush.mockClear();
  mockAssign.mockClear();
  Object.defineProperty(window, "location", { configurable: true, value: { origin: "http://localhost", assign: mockAssign } });
  mockRequestLeave.mockReset().mockImplementation((action: () => void) => action());
});
afterEach(() => Object.defineProperty(window, "location", { configurable: true, value: originalLocation }));

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
  const LinkMock = ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>{children}</a>
  );
  LinkMock.displayName = "Link";
  return LinkMock;
});

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useNavigationLeave: () => mockRequestLeave,
}));
jest.mock("@/hooks/api/access", () => ({ useCan: () => false }));
jest.mock("@/hooks/api/build/custom-states", () => ({ useCustomStates: () => ({ data: [] }) }));

describe("WorkItemRow navigation", () => {
  it("live ticket rows reuse compact fields and hard-load the canonical detail link", async () => {
    render(<WorkItemRow item={{ ...makeItem(35), projectKey: "STRE", version: 4 }} returnHref="/build/my-work?view=list" />);
    await userEvent.click(screen.getByRole("link", { name: "Open Ticket 35" }));
    expect(mockAssign).toHaveBeenCalledWith("/build/1/tickets/STRE-35?returnTo=%2Fbuild%2Fmy-work%3Fview%3Dlist");
    expect(mockPush).not.toHaveBeenCalled();
  });
  it("opens the canonical ticket href through the leave guard on primary click", async () => {
    render(<WorkItemRow item={makeItem(81)} returnHref="/build/my-work?relation=created&q=review" />);
    const link = screen.getByRole("link", { name: /Ticket 81/i });
    await userEvent.click(link);
    expect(mockRequestLeave).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockAssign).toHaveBeenCalledTimes(1);
    expect(mockAssign).toHaveBeenCalledWith(link.getAttribute("href"));
    expect(link).toHaveAttribute("href", "/build/1/tickets/AL-81?returnTo=%2Fbuild%2Fmy-work%3Frelation%3Dcreated%26q%3Dreview");
  });

  it("opens the canonical ticket href when Enter activates the link", async () => {
    render(<WorkItemRow item={makeItem(81)} />);
    const link = screen.getByRole("link", { name: /Ticket 81/i });
    link.focus();
    await userEvent.keyboard("{Enter}");
    expect(mockRequestLeave).toHaveBeenCalledTimes(1);
    expect(mockAssign).toHaveBeenCalledWith(link.getAttribute("href"));
  });

  it("prevents navigation when the leave guard refuses", async () => {
    mockRequestLeave.mockImplementation(() => {});
    render(<WorkItemRow item={makeItem(81)} />);
    const event = createEvent.click(screen.getByRole("link"), { button: 0 });
    fireEvent(screen.getByRole("link"), event);
    expect(event.defaultPrevented).toBe(true);
    expect(mockRequestLeave).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockAssign).not.toHaveBeenCalled();
  });

  it("waits for leave approval before opening the canonical href", async () => {
    mockRequestLeave.mockImplementation(() => {});
    render(<WorkItemRow item={makeItem(81)} />);
    const link = screen.getByRole("link");
    await userEvent.click(link);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockAssign).not.toHaveBeenCalled();
    expect(mockRequestLeave).toHaveBeenCalledTimes(1);
    const [approveLeave] = mockRequestLeave.mock.calls[0];
    act(() => approveLeave());
    expect(mockAssign).toHaveBeenCalledTimes(1);
    expect(mockAssign).toHaveBeenCalledWith(link.getAttribute("href"));
  });

  it.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }])(
    "preserves native canonical navigation for %o",
    (options) => {
      render(<WorkItemRow item={makeItem(81)} />);
      const link = screen.getByRole("link");
      const event = createEvent.click(link, { button: 0, ...options });
      fireEvent(link, event);
      expect(event.defaultPrevented).toBe(false);
      expect(mockRequestLeave).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
      expect(mockAssign).not.toHaveBeenCalled();
      expect(link).toHaveAttribute("href", "/build/1/tickets/AL-81?returnTo=%2Fbuild%2Fmy-work");
    },
  );

  it("keeps the project fallback when a ticket number is unavailable", async () => {
    render(<WorkItemRow item={{ ...makeItem(81), ticketNumber: undefined }} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/build/1");
    await userEvent.click(link);
    expect(mockRequestLeave).toHaveBeenCalledTimes(1);
    expect(mockAssign).toHaveBeenCalledWith("/build/1");
  });
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
