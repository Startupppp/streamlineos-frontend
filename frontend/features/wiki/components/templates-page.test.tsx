import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import TemplatesPage from "./templates-page";

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

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn() })),
  useSearchParams: jest.fn(() => ({ get: (key: string) => (key === "tab" ? "saved" : null), toString: () => "tab=saved" })),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
  deriveContentText: jest.fn(() => ""),
}));

jest.mock("./template-cards", () => ({
  StarterTemplateCard: () => null,
  TemplateCard: ({ template }: { template: { id: number; name: string } }) => (
    <div data-testid={`template-${template.id}`}>{template.name}</div>
  ),
}));

const { useKbPageTemplates } = jest.requireMock("@/hooks/api/kb") as {
  useKbPageTemplates: jest.Mock;
};

const mockTemplate = { id: 1, name: "My Template" };

beforeEach(() => {
  observers.length = 0;
  Reflect.set(globalThis, "IntersectionObserver", FakeIntersectionObserver);
  jest.clearAllMocks();
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(globalThis, "IntersectionObserver");
});

describe("TemplatesPage sentinel (saved tab)", () => {
  it("calls fetchNextPage when the sentinel scrolls into view instead of requiring a button click", () => {
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
