import { render } from "@testing-library/react";
import { RoadmapListPage } from "./roadmap-list-page";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/build/roadmap",
  useSearchParams: () => new URLSearchParams(),
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
  PageTabsToolbar: ({ search }: { search?: React.ReactNode }) => <div>{search}</div>,
}));

jest.mock("@/components/ui/search-input", () => ({
  SearchInput: () => null,
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: string) => v,
}));

let capturedOnItemsChange: ((items: { id: number }[]) => void) | undefined;

jest.mock("./roadmap-tab", () => ({
  RoadmapTab: ({
    onItemsChange,
  }: {
    onItemsChange?: (items: { id: number }[]) => void;
  }) => {
    capturedOnItemsChange = onItemsChange;
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

jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: jest.fn(() => ({ focusedIndex: null, setFocusedIndex: jest.fn() })),
}));

const mockUseBuildListKeyboard = useBuildListKeyboard as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  capturedOnItemsChange = undefined;
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
