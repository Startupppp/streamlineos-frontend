import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { apiClient } from "@/lib/api-client";
import type { PermissionKey } from "@/lib/rbac/permissions";
import type { NurtureSequenceSummary } from "@/types/crm/nurture";
import { NurtureSequencesPage } from "./nurture-sequences-page";

/** Radix Select needs pointer capture and scrollIntoView; jsdom has neither. */
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => undefined;
  Element.prototype.releasePointerCapture = () => undefined;
  Element.prototype.scrollIntoView = () => undefined;
});

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearch = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => "/crm/autonomy/nurture",
  useSearchParams: () => mockSearch,
}));

jest.mock("@animateicons/react/lucide", () => ({ PlusIcon: () => null }));
jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

/**
 * The tenant arrangement is read from the signed-in session, which this test has
 * no business standing up; `useTenantLayout` throws without one. Stubbed to the
 * stock description, as `rep-metrics-table.test.tsx` does — that the arrangement
 * path leaves a description valid is `lib/renderer/registry.test.ts`'s job.
 */
jest.mock("@/components/renderer/use-tenant-layout", () => ({
  useTenantLayout: <T,>(layout: T): T => layout,
}));

jest.mock("./create-nurture-sequence-dialog", () => ({
  CreateNurtureSequenceDialog: () => null,
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockGranted = new Set<string>();
let mockResolved = true;
jest.mock("@/hooks/api/access", () => {
  const { permissionGate } =
    jest.requireActual<typeof import("@/lib/rbac/permission-gate")>(
      "@/lib/rbac/permission-gate",
    );
  return {
    /* Unresolved means allowed is false as well as pending, matching the real
       hook: rights that have not arrived grant nothing. */
    usePermissionGate: (permission: PermissionKey) =>
      permissionGate(permission, mockResolved && mockGranted.has(permission), mockResolved),
    useCan: (permission: PermissionKey) => mockResolved && mockGranted.has(permission),
    useCanState: (permission: PermissionKey) =>
      !mockResolved ? "loading" : mockGranted.has(permission) ? "granted" : "denied",
  };
});

const mockedGet = apiClient.get as jest.Mock;

/**
 * CRM-P1-13. The nurture screen, and the fact that it is not the task-sequence
 * screen.
 *
 * The existing nurture suites are all about a cadence's steps — the clamp, the
 * schema, the editor. None of them touch the list, and none of them touch the
 * thing the ticket is actually about: `/crm/settings/sequences` already exists,
 * is also called "sequences", also has steps and enrolments, and talks to a
 * completely different controller under a different permission. The two are one
 * careless import away from being wired to each other, and the resulting screen
 * would look entirely plausible.
 */

const sequence = (over: Partial<NurtureSequenceSummary> = {}): NurtureSequenceSummary => ({
  nurtureSequenceId: "seq-1",
  name: "Quiet renewals",
  description: "Three nudges over a fortnight",
  status: "active",
  stepCount: 3,
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
  ...over,
});

function page(rows: NurtureSequenceSummary[], nextCursor: string | null = null) {
  return { data: rows, pagination: { nextCursor } };
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <TooltipProvider>{children}</TooltipProvider>
      </QueryClientProvider>
    );
  }
  return render(<NurtureSequencesPage />, { wrapper: Wrapper });
}

/** Paths asked of the API during this test. */
function paths(): string[] {
  return mockedGet.mock.calls.map(([path]) => path as string);
}

describe("NurtureSequencesPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGranted.clear();
    mockGranted.add("crm:autonomy:view");
    mockGranted.add("crm:autonomy:manage");
    mockResolved = true;
    mockSearch = new URLSearchParams();
    mockedGet.mockResolvedValue(page([sequence()]));
  });

  it("reads the nurture controller, not the outreach-sequence one", async () => {
    /**
     * The literal separation. `/crm/sequences` answers a similar-looking list
     * of things with steps and enrolments, so a hook pointed there would render
     * a believable screen of the wrong feature.
     */
    renderPage();

    await waitFor(() => expect(mockedGet).toHaveBeenCalled());
    expect(paths()[0]).toContain("/crm/autonomy/nurture/sequences");
    expect(paths().some((path) => path.startsWith("/crm/sequences"))).toBe(false);
  });

  it("opens a cadence on the nurture route", async () => {
    /** `/crm/settings/sequences/:id` is a different record behind a different key. */
    const user = userEvent.setup();
    renderPage();

    const rows = await screen.findAllByText("Quiet renewals");
    await user.click(rows[0]);

    expect(mockPush).toHaveBeenCalledWith("/crm/autonomy/nurture/seq-1");
  });

  it("narrows the list by status, in the address bar and on the wire", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText("Quiet renewals");

    await user.click(screen.getByRole("combobox", { name: /filter by status/i }));
    await user.click(screen.getByRole("option", { name: "Paused" }));

    expect(mockReplace).toHaveBeenCalledWith("/crm/autonomy/nurture?status=paused", {
      scroll: false,
    });

    /* The router is stubbed, so drive the re-read the way the URL would. */
    mockSearch = new URLSearchParams("status=paused");
    renderPage();
    await waitFor(() =>
      expect(paths().some((path) => path.includes("status=paused"))).toBe(true),
    );
  });

  it("asks nothing, and says why, without the view key", async () => {
    mockGranted.delete("crm:autonomy:view");
    renderPage();

    expect(await screen.findByText(/permission to read the nurture cadences/i)).toBeInTheDocument();
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("offers no way to author one without the manage key", async () => {
    mockGranted.delete("crm:autonomy:manage");
    renderPage();
    await screen.findAllByText("Quiet renewals");

    expect(screen.queryByRole("button", { name: /new sequence/i })).not.toBeInTheDocument();
  });

  it("shows the skeleton while rights are still arriving, not an empty list", async () => {
    /**
     * The disabled-query trap: a query held shut by a pending gate reports
     * `isLoading: false`, so without the gate's own state the first paint of a
     * permitted user's screen says there are no sequences.
     */
    mockResolved = false;
    renderPage();

    expect(screen.queryByText(/no nurture sequences yet/i)).not.toBeInTheDocument();
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("distinguishes an empty filter from an empty product", async () => {
    mockedGet.mockResolvedValue(page([]));
    renderPage();
    expect(await screen.findByText(/no nurture sequences yet/i)).toBeInTheDocument();

    mockSearch = new URLSearchParams("status=paused");
    renderPage();
    expect(await screen.findByText(/nothing with that status/i)).toBeInTheDocument();
  });

  it("offers to author one from the empty screen only when there is no filter on", async () => {
    /** With a filter on, "New sequence" would read as a fix for the empty list. */
    mockedGet.mockResolvedValue(page([]));
    mockSearch = new URLSearchParams("status=paused");
    renderPage();

    await screen.findByText(/nothing with that status/i);
    /* The header action stays; the empty state's own call to action does not. */
    expect(screen.getAllByRole("button", { name: /new sequence/i })).toHaveLength(1);
  });

  it("says the list failed rather than showing none", async () => {
    mockedGet.mockRejectedValue(new Error("upstream is down"));
    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/couldn’t load the sequences/i);
    expect(alert).toHaveTextContent("upstream is down");
  });

  it("offers older sequences only when the server left a cursor", async () => {
    mockedGet.mockResolvedValue(page([sequence()], "cursor-2"));
    renderPage();
    await screen.findAllByText("Quiet renewals");

    expect(screen.getByRole("button", { name: /show older sequences/i })).toBeInTheDocument();
  });

  it("offers no older sequences at the end of the list", async () => {
    renderPage();
    await screen.findAllByText("Quiet renewals");

    expect(
      screen.queryByRole("button", { name: /show older sequences/i }),
    ).not.toBeInTheDocument();
  });
});

/**
 * The separation stated once more, structurally, because the wire assertion
 * above only watches the one component this file renders.
 */
describe("nurture and outreach sequences stay two features", () => {
  const NURTURE = join(__dirname);
  const APP = join(__dirname, "..", "..", "..", "app", "(authenticated)", "crm");

  it("keeps two screens, at two addresses", () => {
    expect(existsSync(join(APP, "autonomy", "nurture", "page.tsx"))).toBe(true);
    expect(existsSync(join(APP, "settings", "sequences", "page.tsx"))).toBe(true);
  });

  it("never imports the outreach-sequence hooks into a nurture file", () => {
    const strays = readdirSync(NURTURE)
      .filter((name) => /\.tsx?$/.test(name) && !name.includes(".test."))
      .filter((name) =>
        /from\s+"@\/hooks\/api\/crm\/sequences"/.test(readFileSync(join(NURTURE, name), "utf8")),
      );

    expect(strays).toEqual([]);
  });
});
