import { Suspense, act } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { ProjectSettingsPage } from "./project-settings-page";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockUpdateProjectMutate = jest.fn();
let mockSearchParams = new URLSearchParams();
let mockDebouncedSearch = "";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/build/1/settings",
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "user-1" } }, status: "authenticated" }),
}));

const MOCK_PROJECT = {
  id: 1,
  name: "Test Project",
  description: "",
  status: "ACTIVE",
  key: "TEST",
  members: [],
};

jest.mock("@/hooks/api/build/projects", () => ({
  useProject: () => ({
    data: MOCK_PROJECT,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useUpdateProject: () => ({ mutate: mockUpdateProjectMutate, isPending: false }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
  useCanState: () => "denied",
  usePermissionGate: (permission: string) => ({ permission, allowed: false, denied: true, pending: false }),
}));

jest.mock("@/hooks/api/crm/clients", () => ({
  useSimpleClientsList: () => ({ data: [], isLoading: false, isError: false, error: null }),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
}));

jest.mock("@/hooks/api/invoices/project-invoice-line-detail", () => ({
  useProjectInvoiceLineDetail: () => ({
    data: { projectId: 1, invoiceLineDetail: "summary" as const },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useUpdateProjectInvoiceLineDetail: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/features/build/settings/project-member-selector", () => ({
  MembersSelector: () => <div data-testid="members-selector" />,
  ReassignDialog: () => null,
}));

jest.mock("@/features/build/settings/danger-zone-section", () => ({
  DangerZoneSection: () => <div data-testid="danger-zone-section" />,
}));

jest.mock("@/features/build/settings/project-member-roles-section", () => ({
  ProjectMemberRolesSection: () => null,
}));

jest.mock("@/features/build/settings/custom-fields-settings", () => ({
  CustomFieldsSettings: () => null,
}));

jest.mock("@/features/build/settings/labels-settings", () => ({
  LabelsSettings: () => <div data-testid="labels-content" />,
}));

jest.mock("@/features/build/settings/statuses-settings", () => ({
  StatusesSettings: () => null,
}));

jest.mock("@/features/build/settings/team-roster-section", () => ({
  TeamRosterSection: () => null,
}));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => true,
}));

jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  useBuildListFilters: () => ({
    search: mockDebouncedSearch,
    debouncedSearch: mockDebouncedSearch,
    setSearch: jest.fn(),
    clearAll: jest.fn(),
    activeCount: 0,
    isFiltered: false,
    resetKey: "",
  }),
}));

const mockUseBuildListKeyboard = jest.fn();

jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: (...args: unknown[]) => mockUseBuildListKeyboard(...args),
}));

jest.mock("@/features/build/shared/build-list-toolbar", () => ({
  BuildListToolbar: () => null,
}));

jest.mock("@/features/build/shared/shortcut-help-dialog", () => ({
  ShortcutHelpDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="shortcut-help-dialog" /> : null,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children, solid: _solid, className }: { children: React.ReactNode; className?: string; solid?: boolean }) => <div className={className}>{children}</div>,
  PmSection: ({ children, index: _index, className }: { children: React.ReactNode; className?: string; index?: number }) => <div className={className}>{children}</div>,
}));

jest.mock("@/lib/text-overflow", () => ({
  TEXT_ONE_LINE: "truncate",
  TEXT_BODY: "",
}));

async function renderPage() {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <ProjectSettingsPage params={Promise.resolve({ projectId: "1" })} />
      </Suspense>,
    );
  });
}

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
  mockUpdateProjectMutate.mockReset();
  mockUseBuildListKeyboard.mockClear();
  mockUseBuildListKeyboard.mockReturnValue({ focusedIndex: null, setFocusedIndex: jest.fn() });
  mockSearchParams = new URLSearchParams();
  mockDebouncedSearch = "";
});

describe("ProjectSettingsPage — search filter (BLD-L4-S1-SEARCH)", () => {
  it("shows all nav sections when the search filter is empty — paired with the filtered test below", async () => {
    await renderPage();
    expect(screen.getByRole("button", { name: "General" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Labels" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Statuses" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Custom Fields" })).toBeInTheDocument();
  });

  it("filters nav sections to only those whose label matches debouncedSearch", async () => {
    mockDebouncedSearch = "lab";
    await renderPage();
    expect(screen.getByRole("button", { name: "Labels" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "General" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Statuses" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Custom Fields" })).not.toBeInTheDocument();
  });

  it("the search is case-insensitive so typing GENERAL matches the General section", async () => {
    mockDebouncedSearch = "GENERAL";
    await renderPage();
    expect(screen.getByRole("button", { name: "General" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Labels" })).not.toBeInTheDocument();
  });
});

describe("ProjectSettingsPage — keyboard shortcut wiring (BLD-L4-S1-KB)", () => {
  it("passes onShortcutHelp to useBuildListKeyboard so the ? key can open the help overlay", async () => {
    await renderPage();
    const options = mockUseBuildListKeyboard.mock.calls[0]?.[0];
    expect(typeof options?.onShortcutHelp).toBe("function");
  });

  it("passes onClearSelection to useBuildListKeyboard so Esc can clear the search filter", async () => {
    await renderPage();
    const options = mockUseBuildListKeyboard.mock.calls[0]?.[0];
    expect(typeof options?.onClearSelection).toBe("function");
  });

  it("passes searchInputRef to useBuildListKeyboard so / focuses the search input", async () => {
    await renderPage();
    const options = mockUseBuildListKeyboard.mock.calls[0]?.[0];
    expect(options?.searchInputRef).toBeDefined();
  });

  it("ShortcutHelpDialog is not shown on initial render — paired with the open test below", async () => {
    await renderPage();
    expect(screen.queryByTestId("shortcut-help-dialog")).not.toBeInTheDocument();
  });

  it("the onShortcutHelp callback passed to the keyboard hook opens the ShortcutHelpDialog when called", async () => {
    await renderPage();
    const options = mockUseBuildListKeyboard.mock.calls[0]?.[0] as { onShortcutHelp: () => void };
    expect(typeof options.onShortcutHelp).toBe("function");
    await act(async () => { options.onShortcutHelp(); });
    expect(screen.getByTestId("shortcut-help-dialog")).toBeInTheDocument();
  });
});

describe("ProjectSettingsPage — conflict banner (BLD-L4-S1-CONFLICT)", () => {
  it("does not show the conflict banner on initial render — paired with the 409 test below", async () => {
    await renderPage();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the conflict banner when the save mutation returns a 409 error", async () => {
    const conflictError = new ApiError("conflict", 409, "CONFLICT");
    mockUpdateProjectMutate.mockImplementation(
      (_values: unknown, options: { onError: (e: unknown) => void }) => {
        options.onError(conflictError);
      },
    );

    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await act(async () => {});

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/saving failed/i)).toBeInTheDocument();
  });
});
