import { fireEvent, render, screen } from "@testing-library/react";
import { RoadmapListPage } from "./roadmap-list-page";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/build/roadmap",
  useSearchParams: () => mockSearchParams,
}));

jest.mock("@/components/auth/require-module", () => ({
  RequireModule: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, filters, actions }: {
    children: React.ReactNode;
    filters?: React.ReactNode;
    actions?: React.ReactNode;
  }) => <div>{actions}{filters}{children}</div>,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_SECTION: "",
}));

jest.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) =>
    value === "roadmap" ? <div>{children}</div> : null,
  TABS_CONTENT_PAGE_BODY_CLASS: "",
}));

jest.mock("@/components/ui/page-tabs-toolbar", () => ({
  PageTabsToolbar: ({ search, filters }: { search?: React.ReactNode; filters?: React.ReactNode | (() => React.ReactNode) }) => (
    <div>
      {search}
      <div data-testid="roadmap-filters">{typeof filters === "function" ? filters() : filters}</div>
    </div>
  ),
}));

jest.mock("@/components/ui/select", () => {
  const react = jest.requireActual<typeof import("react")>("react");
  const SelectChange = react.createContext<((value: string) => void) | undefined>(undefined);
  return {
    Select: ({ children, onValueChange }: { children: React.ReactNode; onValueChange?: (value: string) => void }) => (
      <SelectChange.Provider value={onValueChange}>{children}</SelectChange.Provider>
    ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => {
      const onValueChange = react.useContext(SelectChange);
      const handleClick = () => onValueChange?.(value);
      return (
        <button type="button" onClick={handleClick}>
          {children}
        </button>
      );
    },
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  };
});

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembersByIds: () => ({
    data: { data: [{ membershipId: 9, userId: "user-9", name: "Fox Mulder", email: "fox@example.com", image: null }] },
  }),
}));

jest.mock("@/hooks/api/build/build-members", () => ({
  useBuildMembers: () => ({ data: { data: [{ id: "user-9" }] } }),
}));

jest.mock("@/components/ui/search-input", () => ({
  SearchInput: ({ value, onValueChange }: { value: string; onValueChange: (next: string) => void }) => (
    <input
      aria-label="Search roadmap"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    />
  ),
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: string) => v,
}));

let capturedOnItemsChange: ((items: { id: number }[]) => void) | undefined;
let capturedSearch: string | undefined;
let capturedTabProps: Record<string, unknown> | undefined;

jest.mock("./roadmap-tab", () => ({
  RoadmapTab: ({
    onItemsChange,
    search,
    ...rest
  }: {
    onItemsChange?: (items: { id: number }[]) => void;
    search?: string;
  }) => {
    capturedOnItemsChange = onItemsChange;
    capturedSearch = search;
    capturedTabProps = { search, ...rest };
    return <div data-testid="roadmap-tab" />;
  },
}));

jest.mock("./feedback-tab", () => ({
  FeedbackTab: () => <div data-testid="feedback-tab" />,
}));

jest.mock("./changelog-tab", () => ({
  ChangelogTab: () => <div data-testid="changelog-tab" />,
}));

jest.mock("./roadmap-publication-actions", () => ({
  RoadmapPublicationActions: () => null,
}));

jest.mock("@/hooks/common/use-build-list-keyboard", () => ({
  useBuildListKeyboard: jest.fn(() => ({ focusedIndex: null, setFocusedIndex: jest.fn() })),
}));

const mockUseBuildListKeyboard = useBuildListKeyboard as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  capturedOnItemsChange = undefined;
  capturedTabProps = undefined;
  mockSearchParams = new URLSearchParams();
});

describe("RoadmapListPage — only forwards parameters GET /build/roadmap accepts", () => {
  it("forwards status when the URL carries a value the backend enum allows", () => {
    mockSearchParams = new URLSearchParams("status=in_progress");

    render(<RoadmapListPage />);

    expect(capturedTabProps?.status).toBe("in_progress");
  });

  it("drops a status the backend enum rejects instead of forwarding it into a 400", () => {
    mockSearchParams = new URLSearchParams("status=shipped");

    render(<RoadmapListPage />);

    expect(capturedTabProps?.status).toBeUndefined();
  });

  it("forwards sort when the URL carries a value the backend enum allows", () => {
    mockSearchParams = new URLSearchParams("sort=created_at");

    render(<RoadmapListPage />);

    expect(capturedTabProps?.sort).toBe("created_at");
  });

  it("drops a sort the backend enum rejects instead of forwarding it into a 400", () => {
    mockSearchParams = new URLSearchParams("sort=priority");

    render(<RoadmapListPage />);

    expect(capturedTabProps?.sort).toBeUndefined();
  });

  it("maps productId onto managedProductId because that is the key the list query declares", () => {
    mockSearchParams = new URLSearchParams("productId=42");

    render(<RoadmapListPage />);

    expect(capturedTabProps?.managedProductId).toBe(42);
  });

  it("forwards horizon to RoadmapTab because roadmapListQuerySchema now declares it — a deep-linked horizon reaches the backend", () => {
    mockSearchParams = new URLSearchParams("horizon=2026-Q1");

    render(<RoadmapListPage />);

    expect(capturedTabProps?.horizon).toBe("2026-Q1");
  });

  it("forwards a numeric ownerId because roadmapListQuerySchema now declares it as a membership id", () => {
    mockSearchParams = new URLSearchParams("ownerId=7");

    render(<RoadmapListPage />);

    expect(capturedTabProps?.ownerId).toBe(7);
  });

  it("drops a non-numeric ownerId rather than forwarding NaN, because the backend field coerces to a positive integer and a user id string is not one", () => {
    mockSearchParams = new URLSearchParams("ownerId=user-7");

    render(<RoadmapListPage />);

    expect(capturedTabProps?.ownerId).toBeUndefined();
  });
});

describe("RoadmapListPage — keyboard itemCount (BSN-FE-K3)", () => {
  it("passes itemCount:0 to useBuildListKeyboard before RoadmapTab reports items", () => {
    render(<RoadmapListPage />);

    const firstCall = mockUseBuildListKeyboard.mock.calls[0]?.[0] as { itemCount: number } | undefined;
    expect(firstCall?.itemCount).toBe(0);
  });

  it("passes the real item count to useBuildListKeyboard after RoadmapTab calls onItemsChange", () => {
    const { rerender } = render(<RoadmapListPage />);

    capturedOnItemsChange?.([{ id: 1 }, { id: 2 }, { id: 3 }] as never);

    rerender(<RoadmapListPage />);

    const lastCall = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0] as { itemCount: number } | undefined;
    expect(lastCall?.itemCount).toBe(3);
  });
});

describe("RoadmapListPage — search is URL-backed as q", () => {
  it("writes the typed search to the q parameter rather than holding it in component state", () => {
    render(<RoadmapListPage />);

    fireEvent.change(screen.getByLabelText("Search roadmap"), { target: { value: "billing" } });

    expect(mockReplace).toHaveBeenCalledWith("/build/roadmap?q=billing", { scroll: false });
  });

  it("seeds the search box from q so a shared roadmap link reopens filtered", () => {
    mockSearchParams = new URLSearchParams("q=retention");

    render(<RoadmapListPage />);

    expect(screen.getByLabelText("Search roadmap")).toHaveValue("retention");
  });

  it("removes q from the URL when the search box is emptied instead of leaving q=", () => {
    mockSearchParams = new URLSearchParams("q=retention");
    render(<RoadmapListPage />);

    fireEvent.change(screen.getByLabelText("Search roadmap"), { target: { value: "" } });

    expect(mockReplace).toHaveBeenCalledWith("/build/roadmap", { scroll: false });
  });

  it("forwards the debounced search to RoadmapTab, so the filtered read is server-side", () => {
    mockSearchParams = new URLSearchParams("q=retention");
    render(<RoadmapListPage />);

    expect(capturedSearch).toBe("retention");
  });
});

describe("RoadmapListPage — every response-shaping value has a control that writes the URL", () => {
  it("writes a picked status to the URL rather than filtering the loaded page in memory", () => {
    render(<RoadmapListPage />);
    fireEvent.click(screen.getByRole("button", { name: "In Progress" }));
    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining("status=in_progress"), { scroll: false });
  });

  it("writes a picked sort to the URL", () => {
    render(<RoadmapListPage />);
    fireEvent.click(screen.getByRole("button", { name: "Recently created" }));
    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining("sort=created_at"), { scroll: false });
  });

  it("offers owners by display name and writes the membership id to the URL, never a raw id label", () => {
    render(<RoadmapListPage />);
    expect(screen.getByTestId("roadmap-filters")).toHaveTextContent("Fox Mulder");
    fireEvent.click(screen.getByRole("button", { name: "Fox Mulder" }));
    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining("ownerId=9"), { scroll: false });
  });

  it("commits the typed horizon to the URL on blur", () => {
    render(<RoadmapListPage />);
    const horizon = screen.getByLabelText("Filter by horizon");
    fireEvent.change(horizon, { target: { value: "Q3 2026" } });
    expect(mockReplace).not.toHaveBeenCalled();
    fireEvent.blur(horizon);
    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining("horizon=Q3+2026"), { scroll: false });
  });

  it("commits the typed horizon to the URL on Enter, so the filter is reachable from the keyboard", () => {
    render(<RoadmapListPage />);
    const horizon = screen.getByLabelText("Filter by horizon");
    fireEvent.change(horizon, { target: { value: "Q4 2026" } });
    fireEvent.keyDown(horizon, { key: "Enter" });
    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining("horizon=Q4+2026"), { scroll: false });
  });

  it("seeds the horizon box from the URL so a shared roadmap link reopens filtered", () => {
    mockSearchParams = new URLSearchParams("horizon=Q1 2027");
    render(<RoadmapListPage />);
    expect(screen.getByLabelText("Filter by horizon")).toHaveValue("Q1 2027");
  });

  it("renders no roadmap filter controls on the feedback tab, where they shape no read", () => {
    mockSearchParams = new URLSearchParams("tab=feedback");
    render(<RoadmapListPage />);
    expect(screen.getByTestId("roadmap-filters")).toBeEmptyDOMElement();
  });
});
