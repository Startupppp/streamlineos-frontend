import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      className,
    }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
}));

jest.mock("next/dynamic", () => () => () => null);

let mockScopes: Record<string, boolean> = { "build:tickets:view": true };
let mockIsOnline = true;

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
  useAccess: () => ({
    data: { isOrgOwner: false, scopes: mockScopes, modules: {} },
    isLoading: false,
  }),
}));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => mockIsOnline,
}));

jest.mock("@/hooks/api/build/advanced", () => ({
  useModules: () => ({ data: [{ id: 11, name: "Payments" }] }),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("./table-view", () => ({ TableView: () => null }));
jest.mock("./gantt-view", () => ({ GanttView: () => null }));
let lastWorkloadViewProps: Record<string, unknown> | null = null;
jest.mock("./workload-view", () => ({
  WorkloadView: (props: Record<string, unknown>) => {
    lastWorkloadViewProps = props;
    return null;
  },
}));

jest.mock("@/features/build/shared/bulk-action-bar", () => ({
  BulkActionBar: () => null,
}));

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/ui/kanban-skeleton", () => ({
  KanbanBoardSkeleton: () => null,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => null,
}));

jest.mock("@/lib/motion-presets", () => ({
  pmSnappy: {},
  viewSwap: {},
  viewSwapReduced: {},
}));

jest.mock("@/components/pm-chrome", () => ({ PM_PANEL: "" }));

jest.mock("@/components/ui/content-fill-panel", () => ({
  PAGE_CHROME_X: "",
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: (string | false | undefined | null)[]) =>
    args.filter(Boolean).join(" "),
}));

import { ProjectBoardContent } from "./project-board-content";
import { VIEW_TYPES } from "@/lib/build/view-types";
import type { ViewType } from "@/lib/build/view-types";
import type { KanbanTicket } from "@/features/build/shared/types";
import type { MemberCapacityData } from "./workload-types";
import { isMemberOverCapacity } from "./workload-types";
import { buildBaseProps } from "./project-board-content-test-harness";

beforeEach(() => {
  mockScopes = { "build:tickets:view": true };
  mockIsOnline = true;
});

describe("ProjectBoardContent — render-ladder exhaustiveness", () => {
  it.each([...VIEW_TYPES])(
    "view=%s is handled by the render switch and does not throw",
    (view) => {
      expect(() => {
        render(
          <ProjectBoardContent {...buildBaseProps()} view={view as ViewType} />,
        );
      }).not.toThrow();
    },
  );
});

describe("ProjectBoardContent — truncation notice", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders a load-more sentinel when the board query has a next page", () => {
    const tickets = Array.from({ length: 3 }, (_, i) => ({ id: i })) as unknown as KanbanTicket[];
    render(<ProjectBoardContent {...buildBaseProps(tickets, { isTruncated: true })} />);

    expect(screen.getByRole("button", { name: /load more tickets/i })).toBeInTheDocument();
  });

  it("does not render a truncation notice when all matching tickets fit within the first page", () => {
    render(<ProjectBoardContent {...buildBaseProps([], { isTruncated: false })} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("the load-more button asks its owner for the next page, so the board has exactly one query and one filter derivation", async () => {
    const onLoadMore = jest.fn();

    render(
      <ProjectBoardContent
        {...buildBaseProps([{ id: 1 } as unknown as KanbanTicket], { isTruncated: true, onLoadMore })}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /load more/i }));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("shows a loading status indicator instead of a button while the next page is loading", () => {
    render(
      <ProjectBoardContent
        {...buildBaseProps([{ id: 1, title: "Ticket", type: "TASK", status: "TODO", version: 1 }], {
          isTruncated: true,
          isFetchingMore: true,
        })}
      />,
    );

    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

describe("ProjectBoardContent — the ticket query's loading, error, empty and denied states all resolve through usePageState", () => {
  it("renders a denied state instead of an empty board when the viewer lacks build:tickets:view", () => {
    mockScopes = {};

    render(<ProjectBoardContent {...buildBaseProps()} />);

    expect(screen.getByRole("heading", { name: /access restricted/i })).toBeInTheDocument();
    expect(screen.getByText("build:tickets:view")).toBeInTheDocument();
  });

  it("renders the filtered-empty panel through the empty slot rather than a bare early return", () => {
    render(
      <ProjectBoardContent {...buildBaseProps()} showEmptyFilterState />,
    );

    expect(screen.getByText("No tickets match your filters")).toBeInTheDocument();
  });

  it("renders the ticket query's error with a retry, so a 500 is not shown as an empty board", async () => {
    const onRetry = jest.fn();

    render(
      <ProjectBoardContent
        {...buildBaseProps()}
        isError
        error={new Error("boom")}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText(/boom/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /retry|try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not render any view pane while the ticket query is still loading", () => {
    render(<ProjectBoardContent {...buildBaseProps()} isLoading />);

    expect(screen.queryByText("No tickets match your filters")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("ProjectBoardContent — offline state", () => {
  beforeEach(() => {
    mockIsOnline = false;
    mockScopes = { "build:tickets:view": true };
  });

  it("renders the offline panel instead of the filtered-empty state when the device is offline, so the user sees a freshness warning rather than an empty list", () => {
    render(
      <ProjectBoardContent {...buildBaseProps()} showEmptyFilterState />,
    );

    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
    expect(screen.queryByText("No tickets match your filters")).not.toBeInTheDocument();
  });

  it("renders the online filtered-empty state when the device is online, confirming the offline branch is not always shown", () => {
    mockIsOnline = true;
    render(
      <ProjectBoardContent {...buildBaseProps()} showEmptyFilterState />,
    );

    expect(screen.getByText("No tickets match your filters")).toBeInTheDocument();
    expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument();
  });
});

describe("ProjectBoardContent — offline freshness timestamp", () => {
  beforeEach(() => {
    mockIsOnline = false;
    mockScopes = { "build:tickets:view": true };
  });

  it("renders the last-updated timestamp inside the offline panel when dataUpdatedAt is provided", () => {
    render(
      <ProjectBoardContent
        {...buildBaseProps()}
        showEmptyFilterState
        dataUpdatedAt={Date.now()}
      />,
    );

    expect(screen.getByText(/last updated/i)).toBeInTheDocument();
  });

  it("does not render a timestamp inside the offline panel when dataUpdatedAt is absent", () => {
    render(
      <ProjectBoardContent {...buildBaseProps()} showEmptyFilterState />,
    );

    expect(screen.queryByText(/last updated/i)).not.toBeInTheDocument();
  });

  it("does not render the timestamp on the online path so the online state is unchanged", () => {
    mockIsOnline = true;

    render(
      <ProjectBoardContent
        {...buildBaseProps()}
        dataUpdatedAt={Date.now()}
      />,
    );

    expect(screen.queryByText(/last updated/i)).not.toBeInTheDocument();
  });
});

describe("ProjectBoardContent — workload capacity wiring", () => {
  beforeEach(() => {
    lastWorkloadViewProps = null;
    mockScopes = { "build:tickets:view": true };
  });

  it("forwards capacityByMemberId to WorkloadView when the workload view is active", () => {
    const capacityByMemberId = new Map<string, MemberCapacityData>([
      [
        "user-1",
        {
          capacityHours: 40,
          leaveDays: 0,
          loggedHours: 48,
          estimateHours: 44,
          allocationPercent: 120,
          varianceHours: 8,
          isOverAllocated: true,
          isZeroCapacity: false,
          utilizationPercent: 120,
        },
      ],
    ]);

    render(
      <ProjectBoardContent
        {...buildBaseProps()}
        view="workload"
        capacityByMemberId={capacityByMemberId}
      />,
    );

    expect(lastWorkloadViewProps?.capacityByMemberId).toBe(capacityByMemberId);
  });

  it("a member with low ticket count but isOverAllocated=true is flagged over-capacity — revert the wiring and this fails", () => {
    const overAllocated: MemberCapacityData = {
      capacityHours: 8,
      leaveDays: 0,
      loggedHours: 10,
      estimateHours: 9,
      allocationPercent: 125,
      varianceHours: 2,
      isOverAllocated: true,
      isZeroCapacity: false,
      utilizationPercent: 125,
    };
    expect(isMemberOverCapacity(1, overAllocated)).toBe(true);
    expect(isMemberOverCapacity(1, undefined)).toBe(false);
  });
});

describe("ProjectBoardContent — a first run and a filtered-out list are different screens", () => {
  beforeEach(() => {
    mockScopes = { "build:tickets:view": true };
    mockIsOnline = true;
  });

  it("offers the first-run copy when the collection is empty and no filter is active", () => {
    render(<ProjectBoardContent {...buildBaseProps()} hasActiveFilters={false} />);
    expect(screen.getByText("No tickets yet")).toBeInTheDocument();
    expect(screen.queryByText("No tickets match your filters")).not.toBeInTheDocument();
  });

  it("offers the filtered copy with a clear action when a filter is active, not the first-run copy", () => {
    render(<ProjectBoardContent {...buildBaseProps()} hasActiveFilters />);
    expect(screen.getByText("No tickets match your filters")).toBeInTheDocument();
    expect(screen.queryByText("No tickets yet")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear all filters/i })).toBeInTheDocument();
  });

  it("offers the filtered copy when the page reports a filtered-empty result even without the filter flag", () => {
    render(<ProjectBoardContent {...buildBaseProps()} showEmptyFilterState />);
    expect(screen.getByText("No tickets match your filters")).toBeInTheDocument();
  });

  it("prefers the offline panel over either empty copy, because the list may be stale rather than empty", () => {
    mockIsOnline = false;
    render(<ProjectBoardContent {...buildBaseProps()} hasActiveFilters />);
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
    expect(screen.queryByText("No tickets match your filters")).not.toBeInTheDocument();
    expect(screen.queryByText("No tickets yet")).not.toBeInTheDocument();
  });

  it("renders neither empty copy once the collection has a row", () => {
    render(
      <ProjectBoardContent
        {...buildBaseProps([
          { id: 1, title: "Widen the grain", type: "TASK", status: "TODO", version: 1 },
        ])}
        hasActiveFilters={false}
      />,
    );
    expect(screen.queryByText("No tickets yet")).not.toBeInTheDocument();
    expect(screen.queryByText("No tickets match your filters")).not.toBeInTheDocument();
  });

  it("keeps the workload view rendering with no tickets, because it aggregates people and not only work", () => {
    render(<ProjectBoardContent {...buildBaseProps()} hasActiveFilters={false} view="workload" />);
    expect(screen.queryByText("No tickets yet")).not.toBeInTheDocument();
  });
});
