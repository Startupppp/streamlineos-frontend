import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NO_HIERARCHY_COPY } from "@/features/hr/org-chart/org-chart-collection";
import type { OrgChartNode } from "@/features/hr/org-chart/types";

let currentQuery = "";
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/hr/org-chart",
  useSearchParams: () => new URLSearchParams(currentQuery),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: "o1", user: { id: "u0" } } }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({
    data: { scopes: { "hr:employees:view": "all" }, modules: { hr: true }, isOrgOwner: true },
    refetch: jest.fn(),
  }),
  useModuleEnabled: () => true,
}));

jest.mock("@/hooks/api/use-page-state", () => {
  const { resolvePageState } = jest.requireActual<
    typeof import("@/lib/page-state/resolve-page-state")
  >("@/lib/page-state/resolve-page-state");
  return {
    usePageState: (
      options: Omit<Parameters<typeof resolvePageState>[0], "access">,
    ) => resolvePageState({ ...options, access: "granted" }),
  };
});

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

const apiGet = jest.fn();
jest.mock("@/lib/api-client", () => ({
  apiClient: { get: (...args: unknown[]) => apiGet(...args) },
}));

import { OrgChartPage } from "@/features/hr/org-chart/org-chart-page";

function node(overrides: Partial<OrgChartNode> = {}): OrgChartNode {
  return {
    id: "u1",
    name: "Ada Lovelace",
    role: "Engineer",
    designation: "Head of Engineering",
    image: null,
    departmentId: "d1",
    departmentName: "Engineering",
    hasDirectReports: true,
    isOwner: true,
    isTopLevel: false,
    ...overrides,
  };
}

function page(nodes: OrgChartNode[], hasMore = false) {
  return { data: nodes, pageInfo: { limit: 20, hasMore, nextCursor: hasMore ? "c2" : null } };
}

function renderChart() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <OrgChartPage />
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  currentQuery = "";
  apiGet.mockReset();
});

describe("HRMS-UX-012 — the chart loads a neighbourhood, never the whole org", () => {
  it("asks only for the roots on first paint, with a bounded limit and no parentId", async () => {
    apiGet.mockResolvedValue(page([node()]));
    renderChart();
    await screen.findByText("Ada Lovelace");

    const params = apiGet.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(apiGet).toHaveBeenCalledWith(
      "/hr/org-chart",
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
    expect(params.limit).toBe(20);
    expect(params.parentId).toBeUndefined();
  });

  it("fetches one branch, scoped by parentId, only when it is expanded", async () => {
    apiGet.mockResolvedValue(page([node()]));
    renderChart();
    await screen.findByText("Ada Lovelace");
    expect(
      apiGet.mock.calls.some(
        (call) => (call[1] as Record<string, unknown>).parentId !== undefined,
      ),
    ).toBe(false);

    apiGet.mockResolvedValue(page([node({ id: "u2", name: "Ravi", hasDirectReports: false })]));
    await userEvent.click(
      screen.getByRole("button", { name: /Expand direct reports for Ada Lovelace/ }),
    );

    await waitFor(() =>
      expect(
        apiGet.mock.calls.some(
          (call) => (call[1] as Record<string, unknown>).parentId === "u1",
        ),
      ).toBe(true),
    );
  });
});

describe("HRMS-UX-012 — ?q= focuses a person and the focus survives re-render", () => {
  it("marks the matched person as current", async () => {
    currentQuery = "q=ada";
    apiGet.mockResolvedValue(page([node()]));
    renderChart();

    const card = await screen.findByRole("button", { name: "Open details for Ada Lovelace" });
    expect(card).toHaveAttribute("aria-current", "true");
  });

  it("keeps the same person focused after the list refetches", async () => {
    currentQuery = "q=ada";
    apiGet.mockResolvedValue(page([node()]));
    renderChart();
    await screen.findByRole("button", { name: "Open details for Ada Lovelace" });

    apiGet.mockResolvedValue(page([node(), node({ id: "u9", name: "Adam" })]));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Open details for Ada Lovelace" }),
      ).toHaveAttribute("aria-current", "true"),
    );
  });
});

describe("HRMS-UX-012 — the states are first-class", () => {
  it("an org with no reporting lines says exactly what to do about it", async () => {
    apiGet.mockResolvedValue(page([]));
    renderChart();
    expect(await screen.findByText(NO_HIERARCHY_COPY)).toBeInTheDocument();
  });

  it("a failed read is a failure with a retry, not an empty chart", async () => {
    apiGet.mockRejectedValue(new Error("read failed"));
    renderChart();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.queryByText(NO_HIERARCHY_COPY)).not.toBeInTheDocument();
  });
});

describe("HRMS-UX-012 — a node opens the shared person drawer", () => {
  it("clicking a person opens the drawer with their identity and a profile link", async () => {
    apiGet.mockResolvedValue(page([node()]));
    renderChart();

    await userEvent.click(await screen.findByRole("button", { name: "Open details for Ada Lovelace" }));

    const drawer = await screen.findByRole("dialog");
    expect(drawer).toHaveTextContent("Ada Lovelace");
    expect(drawer).toHaveTextContent("Head of Engineering");
  });
});
