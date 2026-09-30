"use client";

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientVisibilityPage } from "./client-visibility-page";

let currentSearch = new URLSearchParams();
const mockReplace = jest.fn();
const mockUseSearchParams = jest.fn(() => currentSearch);

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockUseSearchParams(),
  usePathname: () => "/build/1/client-portal",
}));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => true,
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_ROW: "pm-row-class",
  CONTENT_FILL_PANEL: "pm-fill-panel-class",
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ScrollBar: () => null,
}));

jest.mock("@/components/ui/page-tabs-toolbar", () => ({
  PageTabsToolbar: ({ tabs }: { tabs: React.ReactNode }) => <div>{tabs}</div>,
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
    children,
  }: {
    resolution: { kind: string };
    loading: React.ReactNode;
    children?: React.ReactNode;
  }) => {
    if (resolution.kind === "loading") return <>{loading}</>;
    return <>{children}</>;
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
}));

jest.mock("@/components/ui/infinite-scroll-sentinel", () => ({
  InfiniteScrollSentinel: () => null,
}));

const emptyInfiniteQuery = () => ({
  items: [],
  hasMore: false,
  isLoading: false,
  isError: false,
  error: undefined,
  isFetchingNextPage: false,
  fetchNextPage: jest.fn(),
  refetch: jest.fn(),
});

jest.mock("@/hooks/api/build/client-portal", () => ({
  useClientVisibilityTicketsInfinite: () => emptyInfiniteQuery(),
  useClientVisibilityMilestonesInfinite: () => emptyInfiniteQuery(),
  useUpdateTicketVisibility: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateMilestoneVisibility: () => ({ mutate: jest.fn(), isPending: false }),
}));

let capturedTabOnValueChange: ((v: string) => void) | undefined;

jest.mock("@/components/ui/tabs", () => ({
  Tabs: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => {
    capturedTabOnValueChange = onValueChange;
    return <div data-active-tab={value}>{children}</div>;
  },
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div role="tablist">{children}</div>
  ),
  TabsTrigger: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => (
    <button
      role="tab"
      data-value={value}
      onClick={() => capturedTabOnValueChange?.(value)}
    >
      {children}
    </button>
  ),
  TabsContent: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <div data-tab-content={value}>{children}</div>,
}));

beforeEach(() => {
  jest.clearAllMocks();
  capturedTabOnValueChange = undefined;
  currentSearch = new URLSearchParams();
});

describe("tab URL state — ClientVisibilityPage inner tabs (FE-86, BUG-047)", () => {
  it("defaults to the tickets tab when no section param is present in the URL (FE-122 negative control)", () => {
    currentSearch = new URLSearchParams();
    render(<ClientVisibilityPage projectId={1} />);
    const tabsRoot = document.querySelector("[data-active-tab]");
    expect(tabsRoot?.getAttribute("data-active-tab")).toBe("tickets");
  });

  it("activates the milestones tab when section=milestones is in the URL (FE-122 positive)", () => {
    currentSearch = new URLSearchParams("section=milestones");
    render(<ClientVisibilityPage projectId={1} />);
    const tabsRoot = document.querySelector("[data-active-tab]");
    expect(tabsRoot?.getAttribute("data-active-tab")).toBe("milestones");
  });

  it("clicking the milestones trigger writes section=milestones to the URL with scroll:false (FE-86)", async () => {
    currentSearch = new URLSearchParams();
    render(<ClientVisibilityPage projectId={1} />);
    const milestonesBtn = screen.getByRole("tab", { name: /milestones/i });
    await userEvent.click(milestonesBtn);
    expect(mockReplace).toHaveBeenCalledWith(
      "/build/1/client-portal?section=milestones",
      { scroll: false },
    );
  });

  it("clicking the tickets trigger removes the section param and does not produce a trailing question mark (BUG-047)", async () => {
    currentSearch = new URLSearchParams("section=milestones");
    render(<ClientVisibilityPage projectId={1} />);
    const ticketsBtn = screen.getByRole("tab", { name: /tickets/i });
    await userEvent.click(ticketsBtn);
    const [[calledUrl]] = mockReplace.mock.calls;
    expect(calledUrl).toBe("/build/1/client-portal");
    expect(calledUrl).not.toContain("?");
  });

  it("uses the sectionParamKey prop as the URL parameter key so it does not collide with the outer portal section param (FE-86)", async () => {
    currentSearch = new URLSearchParams("section=visibility");
    render(<ClientVisibilityPage projectId={1} sectionParamKey="vsec" />);
    const milestonesBtn = screen.getByRole("tab", { name: /milestones/i });
    await userEvent.click(milestonesBtn);
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("vsec=milestones"),
      { scroll: false },
    );
    const [[calledUrl]] = mockReplace.mock.calls;
    expect(calledUrl).toContain("section=visibility");
  });
});
