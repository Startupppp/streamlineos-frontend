import React from "react";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TemplatesPage from "./templates-page";
import { STARTER_TEMPLATES, type StarterTemplate } from "@/features/wiki/lib/starter-templates";

type IntersectionCallback = (entries: IntersectionObserverEntry[]) => void;

const observers: {
  callback: IntersectionCallback;
  options: IntersectionObserverInit | undefined;
  observed: Element[];
  disconnected: boolean;
}[] = [];

class FakeIntersectionObserver {
  constructor(callback: IntersectionCallback, options?: IntersectionObserverInit) {
    this.entry = { callback, options, observed: [], disconnected: false };
    observers.push(this.entry);
  }
  private entry: (typeof observers)[number];
  observe(element: Element) {
    this.entry.observed.push(element);
  }
  disconnect() {
    this.entry.disconnected = true;
  }
  unobserve() {}
}

function intersect(index = 0) {
  const observer = observers[index];
  if (!observer) throw new Error("no observer was created");
  observer.callback([{ isIntersecting: true } as IntersectionObserverEntry]);
}

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: mockReplace })),
  useSearchParams: jest.fn(() => mockSearchParams),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    subtitle,
    children,
  }: {
    subtitle?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      {subtitle}
      {children}
    </div>
  ),
}));

jest.mock("@/hooks/api/kb", () => ({
  useKbPageTemplates: jest.fn(),
  useCreateKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUpdateKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => false),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: jest.fn(() => ({ kind: "ready" })),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
    empty,
    children,
  }: {
    resolution: { kind: string };
    loading: React.ReactNode;
    empty?: React.ReactNode;
    children: React.ReactNode;
  }) => {
    if (resolution.kind === "loading") return <>{loading}</>;
    if (resolution.kind === "empty") return <>{empty ?? null}</>;
    return <>{children}</>;
  },
}));

jest.mock("@/features/wiki/lib/kb-icons", () => ({
  KbLayoutTemplateIcon: ({ className }: { className?: string }) => <span className={className} />,
}));

jest.mock("@/lib/knowledge-routes", () => ({
  KB_TEMPLATES: "/wiki/templates",
  pageHref: (id: number) => `/wiki/pages/${id}`,
}));

jest.mock("@/features/wiki/lib/starter-templates", () => ({
  STARTER_TEMPLATES: [],
  STARTER_TEMPLATE_CATEGORIES: [],
  deriveContentText: jest.fn(() => ""),
}));

jest.mock("./template-cards", () => ({
  StarterTemplateCard: ({ template }: { template: StarterTemplate }) => (
    <div data-testid={`starter-${template.key}`}>{template.name}</div>
  ),
  TemplateCard: ({ template }: { template: { id: number; name: string } }) => (
    <div data-testid={`template-${template.id}`}>{template.name}</div>
  ),
}));

jest.mock("./template-preview-dialog", () => ({
  TemplatePreviewDialog: () => null,
}));

const { useKbPageTemplates } = jest.requireMock("@/hooks/api/kb") as {
  useKbPageTemplates: jest.Mock;
};

const mockTemplate = { id: 1, name: "My Template" };

beforeEach(() => {
  observers.length = 0;
  STARTER_TEMPLATES.length = 0;
  Reflect.set(globalThis, "IntersectionObserver", FakeIntersectionObserver);
  mockSearchParams = new URLSearchParams();
  jest.clearAllMocks();
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(globalThis, "IntersectionObserver");
});

function makeStarter(key: string, name: string, expectedOutput: string): StarterTemplate {
  return {
    key,
    name,
    icon: "📄",
    description: "Reusable page layout",
    category: "Process & Operations",
    expectedOutput,
    content: { type: "doc", children: [] },
  };
}

describe("TemplatesPage — URL search across tabs", () => {
  it("filters starter use cases from the q URL parameter and shows the search input", () => {
    STARTER_TEMPLATES.push(
      makeStarter("onboarding", "Process guide", "An onboarding checklist"),
      makeStarter("operations", "Operations guide", "A maintenance runbook"),
    );
    mockSearchParams = new URLSearchParams("tab=starters&q=onboarding");
    useKbPageTemplates.mockReturnValue({ data: [], isLoading: false, isError: false });

    render(<TemplatesPage />);

    expect(screen.getByRole("searchbox", { name: "Search templates" })).toHaveValue("onboarding");
    expect(screen.getByTestId("starter-onboarding")).toBeInTheDocument();
    expect(screen.queryByTestId("starter-operations")).not.toBeInTheDocument();
  });

  it("updates the starter search URL after the debounce", () => {
    jest.useFakeTimers();
    STARTER_TEMPLATES.push(makeStarter("onboarding", "Process guide", "An onboarding checklist"));
    useKbPageTemplates.mockReturnValue({ data: [], isLoading: false, isError: false });

    render(<TemplatesPage />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search templates" }), {
      target: { value: "onboarding" },
    });
    act(() => jest.advanceTimersByTime(300));

    expect(mockReplace).toHaveBeenCalledWith("/wiki/templates?q=onboarding", { scroll: false });
    jest.useRealTimers();
  });

  it("refreshes the search input when URL q changes through navigation", () => {
    useKbPageTemplates.mockReturnValue({ data: [], isLoading: false, isError: false });
    mockSearchParams = new URLSearchParams("q=first");
    const view = render(<TemplatesPage />);

    mockSearchParams = new URLSearchParams("q=second");
    view.rerender(<TemplatesPage />);

    expect(screen.getByRole("searchbox", { name: "Search templates" })).toHaveValue("second");
  });
});
describe("TemplatesPage sentinel (saved tab)", () => {
  it("calls fetchNextPage when the sentinel scrolls into view instead of requiring a button click", () => {
    mockSearchParams = new URLSearchParams("tab=saved");
    const fetchNextPage = jest.fn();
    useKbPageTemplates.mockReturnValue({
      data: [mockTemplate],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage,
    });

    render(<TemplatesPage />);

    expect(fetchNextPage).not.toHaveBeenCalled();
    intersect();
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("exposes an accessible load-more control with the sentinel label", () => {
    mockSearchParams = new URLSearchParams("tab=saved");
    useKbPageTemplates.mockReturnValue({
      data: [mockTemplate],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });

    render(<TemplatesPage />);

    expect(screen.getByRole("button", { name: "Load more templates" })).toBeInTheDocument();
  });
});

describe("TemplatesPage — Starters / Saved tabs", () => {
  it("defaults to Starters and hides saved templates", () => {
    useKbPageTemplates.mockReturnValue({
      data: [{ id: 11, name: "Meeting notes", description: null, icon: null }],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      isFetchingNextPage: false,
    });

    render(<TemplatesPage />);

    expect(screen.getByRole("tab", { name: /^starters$/i })).toHaveAttribute(
      "data-state",
      "active",
    );
    expect(screen.queryByText("Meeting notes")).toBeNull();
    expect(screen.getByText("Built-in skeletons ready to use")).toBeInTheDocument();
  });

  it("shows saved templates when tab=saved", () => {
    mockSearchParams = new URLSearchParams("tab=saved");
    useKbPageTemplates.mockReturnValue({
      data: [{ id: 11, name: "Meeting notes", description: null, icon: null }],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      isFetchingNextPage: false,
    });

    render(<TemplatesPage />);

    expect(screen.getByRole("tab", { name: /^saved$/i })).toHaveAttribute(
      "data-state",
      "active",
    );
    expect(screen.getByText("Meeting notes")).toBeInTheDocument();
    expect(screen.getByText("Templates created from your wiki pages")).toBeInTheDocument();
  });

  it("writes tab=saved into the URL when Saved is selected", async () => {
    const user = userEvent.setup();
    useKbPageTemplates.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      isFetchingNextPage: false,
    });

    render(<TemplatesPage />);

    await user.click(screen.getByRole("tab", { name: /^saved$/i }));

    expect(mockReplace).toHaveBeenCalledWith("/wiki/templates?tab=saved", { scroll: false });
  });
});
