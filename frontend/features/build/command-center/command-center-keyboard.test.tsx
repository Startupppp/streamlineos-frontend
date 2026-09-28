import type { ReactNode, UIEvent } from "react";
import { render, screen } from "@testing-library/react";
import { MyIssuesPanel } from "./command-center-my-issues-panel";
import type { MyWorkItem } from "@/types/projects/my-work";

const mockMyWorkRow = jest.fn(({ isFocused }: { isFocused?: boolean; item: MyWorkItem }) => (
  <div data-testid="my-work-row" data-focused={String(Boolean(isFocused))} />
));

jest.mock("./command-center-rows", () => ({
  MyWorkRow: (props: { item: MyWorkItem; isFocused?: boolean }) => mockMyWorkRow(props),
}));

jest.mock("./command-center-actions", () => ({
  CreateIssueButton: () => null,
}));

jest.mock("./panel-header", () => ({
  PanelHeader: ({ title }: { title: string }) => <div>{title}</div>,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmSection: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PmStaggerList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ title }: { title: string }) => <div>{title}</div>,
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("lucide-react", () => ({
  ArrowRight: () => null,
  Loader2: () => null,
}));

function makeItem(id: number): MyWorkItem {
  return {
    id,
    projectId: 1,
    projectKey: "TEST",
    projectName: "Test project",
    ticketNumber: id,
    title: `Item ${id}`,
    status: "TODO",
    priority: "MEDIUM",
    type: "task",
    dueDate: null,
  };
}

const BASE_PROPS = {
  projects: [],
  isLoading: false,
  isError: false,
  isFetchingNextPage: false,
  emptyActions: { action: { label: "Create", onClick: () => {} } },
  onRetry: () => {},
  onScroll: (_e: UIEvent<HTMLDivElement>) => {},
  onCreateIssue: () => {},
  onCreateForProject: (_id: number) => {},
};

beforeEach(() => {
  mockMyWorkRow.mockClear();
});

describe("MyIssuesPanel — focusedIndex highlights the correct row for keyboard navigation", () => {
  it("passes isFocused=true to the row at focusedIndex so the j/k selection is visible", () => {
    const items = [makeItem(1), makeItem(2), makeItem(3)];
    render(<MyIssuesPanel {...BASE_PROPS} items={items} focusedIndex={1} />);

    const rows = screen.getAllByTestId("my-work-row");
    expect(rows[0]).toHaveAttribute("data-focused", "false");
    expect(rows[1]).toHaveAttribute("data-focused", "true");
    expect(rows[2]).toHaveAttribute("data-focused", "false");
  });

  it("passes isFocused=false to all rows when focusedIndex is null so no row is highlighted by default", () => {
    const items = [makeItem(1), makeItem(2)];
    render(<MyIssuesPanel {...BASE_PROPS} items={items} focusedIndex={null} />);

    const rows = screen.getAllByTestId("my-work-row");
    rows.forEach((row) => expect(row).toHaveAttribute("data-focused", "false"));
  });

  it("passes isFocused=true to the first row when focusedIndex is 0 so j advances from no-selection to row 1", () => {
    const items = [makeItem(10), makeItem(20)];
    render(<MyIssuesPanel {...BASE_PROPS} items={items} focusedIndex={0} />);

    const rows = screen.getAllByTestId("my-work-row");
    expect(rows[0]).toHaveAttribute("data-focused", "true");
    expect(rows[1]).toHaveAttribute("data-focused", "false");
  });
});
