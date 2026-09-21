import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { apiClient } from "@/lib/api-client";
import type { PermissionKey } from "@/lib/rbac/permissions";
import type { Segment, SegmentSummary } from "@/types/crm/segments";
import { SegmentsPage } from "./segments-page";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: (message: string) => mockToastSuccess(message),
    error: (message: string) => mockToastError(message),
  },
}));

jest.mock("@animateicons/react/lucide", () => ({ PlusIcon: () => null }));
jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({
    iconRef: { current: null },
    /* AnimatedIconButton calls both on hover, so they have to be callable. */
    hoverHandlers: { onMouseEnter: () => undefined, onMouseLeave: () => undefined },
  }),
}));

/** Renderer-backed list: `useTenantLayout` reads the signed-in tenant's arrangement. */
jest.mock("@/components/renderer/use-tenant-layout", () => ({
  useTenantLayout: <T,>(layout: T): T => layout,
}));

/**
 * The two sheets are stubbed down to what they were handed. What this page owes
 * them is the right subject — a create that carries no segment, an edit that
 * carries the stored criteria — and that is a property of this component, not of
 * the forms inside them.
 */
jest.mock("./segment-sheet", () => ({
  SegmentSheet: ({ open, segment }: { open: boolean; segment: Segment | null }) =>
    open ? (
      <div data-testid="segment-sheet">
        {segment === null ? "new segment" : `editing ${segment.name}`}
      </div>
    ) : null,
}));

jest.mock("./segment-members-sheet", () => ({
  SegmentMembersSheet: ({
    open,
    segment,
  }: {
    open: boolean;
    segment: SegmentSummary | null;
  }) => (open ? <div data-testid="members-sheet">{segment?.name}</div> : null),
}));

const mockGranted = new Set<string>();
jest.mock("@/hooks/api/access", () => {
  const { permissionGate } =
    jest.requireActual<typeof import("@/lib/rbac/permission-gate")>(
      "@/lib/rbac/permission-gate",
    );
  return {
    usePermissionGate: (permission: PermissionKey) =>
      permissionGate(permission, mockGranted.has(permission), true),
    useCan: (permission: PermissionKey) => mockGranted.has(permission),
    useAccess: () => ({
      data: {
        modules: {},
        isOrgOwner: false,
        scopes: Object.fromEntries([...mockGranted].map((key) => [key, "all"])),
      },
      isLoading: false,
      refetch: jest.fn(),
    }),
  };
});

const mockedGet = apiClient.get as jest.Mock;
const mockedDelete = apiClient.delete as jest.Mock;

const VIEW = "crm:segments:view";
const MANAGE = "crm:segments:manage";

/**
 * CRM-P2-02. The segment list and the way into a new one.
 *
 * `segment-criteria.test.ts` covers the conversion between what a person draws
 * and what the server stores — the part with the interesting arithmetic. This
 * covers the screen around it, which had nothing: which endpoint the list reads,
 * what "empty" means on a page whose search filters rows already in hand, and
 * the one asymmetry worth pinning — creating opens the sheet with no subject
 * while editing opens it with a segment the server was asked for by id.
 */

const summary = (over: Partial<SegmentSummary> = {}): SegmentSummary => ({
  segmentId: "seg-1",
  name: "Textiles in Gujarat",
  description: "Industry and state",
  sourceKey: "parties",
  createdByUserId: "user-1",
  createdByName: "Ana Reyes",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
  ...over,
});

const stored: Segment = {
  segmentId: "seg-1",
  organizationId: "org-1",
  name: "Textiles in Gujarat",
  description: "Industry and state",
  sourceKey: "parties",
  criteria: { kind: "compare", field: "industry", operator: "eq", value: "textiles" },
  createdByUserId: "user-1",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
};

const SOURCES = [{ key: "parties", label: "Customers", fields: [] }];

function respondWith(rows: SegmentSummary[] | Error) {
  mockedGet.mockImplementation((path: string) => {
    if (path === "/crm/segments/sources") return Promise.resolve(SOURCES);
    if (path === "/crm/segments/seg-1") return Promise.resolve(stored);
    if (path === "/crm/segments")
      return rows instanceof Error ? Promise.reject(rows) : Promise.resolve(rows);
    return Promise.resolve([]);
  });
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <TooltipProvider>{children}</TooltipProvider>
      </QueryClientProvider>
    );
  }
  return render(<SegmentsPage />, { wrapper: Wrapper });
}

/** Paths asked of the API during this test. */
function paths(): string[] {
  return mockedGet.mock.calls.map(([path]) => path as string);
}

/** The list read's params, which is the second argument `apiClient.get` takes. */
function listParams(): Record<string, unknown> | undefined {
  const call = mockedGet.mock.calls.filter(([path]) => path === "/crm/segments").at(-1);
  return call?.[1] as Record<string, unknown> | undefined;
}

describe("SegmentsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGranted.clear();
    mockGranted.add(VIEW);
    mockGranted.add(MANAGE);
    respondWith([summary()]);
    mockedDelete.mockResolvedValue({ deleted: true });
  });

  it("lists the segments, a page at a time", async () => {
    renderPage();
    await screen.findAllByText("Textiles in Gujarat");

    expect(listParams()).toEqual({ limit: 25, offset: 0 });
  });

  it("opens a new segment with no subject, and asks the server for none", async () => {
    /**
     * The asymmetry. `useSegment(editId)` is disabled while `editId` is null;
     * if creating ever set an id the sheet would open pre-filled with somebody
     * else's criteria, and saving would look like authoring a new segment.
     */
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText("Textiles in Gujarat");

    await user.click(screen.getByRole("button", { name: /new segment/i }));

    expect(screen.getByTestId("segment-sheet")).toHaveTextContent("new segment");
    expect(paths()).not.toContain("/crm/segments/seg-1");
  });

  it("opens an existing segment with the criteria the server holds", async () => {
    /**
     * The list projects no criteria tree, so an edit sheet fed from the row
     * would open every segment as an empty one and save that over it.
     */
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText("Textiles in Gujarat");

    await user.click(screen.getAllByRole("button", { name: /edit textiles/i })[0]);

    await waitFor(() => expect(paths()).toContain("/crm/segments/seg-1"));
    expect(await screen.findByTestId("segment-sheet")).toHaveTextContent(
      "editing Textiles in Gujarat",
    );
  });

  it("opens the people a segment matches, from the row itself", async () => {
    const user = userEvent.setup();
    renderPage();

    const rows = await screen.findAllByText("Textiles in Gujarat");
    await user.click(rows[0]);

    expect(screen.getByTestId("members-sheet")).toHaveTextContent("Textiles in Gujarat");
  });

  it("offers no authoring at all without the manage key", async () => {
    mockGranted.delete(MANAGE);
    renderPage();
    await screen.findAllByText("Textiles in Gujarat");

    expect(screen.queryByRole("button", { name: /new segment/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit textiles/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete textiles/i })).not.toBeInTheDocument();
  });

  it("reads nothing, and says why, without the view key", async () => {
    mockGranted.delete(VIEW);
    renderPage();

    expect(await screen.findByText(/permission/i)).toBeInTheDocument();
    expect(listParams()).toBeUndefined();
  });

  it("deletes only after it is confirmed", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText("Textiles in Gujarat");

    await user.click(screen.getAllByRole("button", { name: /delete textiles/i })[0]);
    expect(mockedDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /^delete segment$/i }));

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith("/crm/segments/seg-1"));
    expect(mockToastSuccess).toHaveBeenCalledWith("Segment deleted");
  });

  it("says a delete failed rather than reporting it done", async () => {
    mockedDelete.mockRejectedValue(new Error("Segment is referenced by a campaign"));
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText("Textiles in Gujarat");

    await user.click(screen.getAllByRole("button", { name: /delete textiles/i })[0]);
    await user.click(screen.getByRole("button", { name: /^delete segment$/i }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("Segment is referenced by a campaign"),
    );
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it("distinguishes nothing on this page from nothing at all", async () => {
    /**
     * Search narrows the rows already loaded — `GET /crm/segments` takes no
     * query — so "no matches" here means "not on this page", and offering
     * "New segment" as the way out of it would be the wrong advice.
     */
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText("Textiles in Gujarat");

    await user.type(screen.getByRole("searchbox"), "pharmaceutical");

    expect(await screen.findByText(/no segments match that search/i)).toBeInTheDocument();
    expect(screen.getByText(/clear the search to see every segment/i)).toBeInTheDocument();
    /* The empty state's own way out — the last of the two, after the input's. */
    await user.click(screen.getAllByRole("button", { name: /clear search/i }).at(-1)!);

    expect(await screen.findAllByText("Textiles in Gujarat")).not.toHaveLength(0);
  });

  it("invites a first segment when the tenant has none", async () => {
    respondWith([]);
    renderPage();

    expect(await screen.findByText(/no segments yet/i)).toBeInTheDocument();
    /* The header action plus the empty state's own. */
    expect(screen.getAllByRole("button", { name: /new segment/i })).toHaveLength(2);
  });

  it("does not invite a segment it would not let you author", async () => {
    respondWith([]);
    mockGranted.delete(MANAGE);
    renderPage();

    await screen.findByText(/no segments yet/i);
    expect(screen.queryByRole("button", { name: /new segment/i })).not.toBeInTheDocument();
  });

  it("says the list failed rather than showing no segments", async () => {
    respondWith(new Error("upstream is down"));
    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/upstream is down/i);
    expect(screen.queryByText(/no segments yet/i)).not.toBeInTheDocument();
  });
});
