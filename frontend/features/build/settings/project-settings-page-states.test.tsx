import { Suspense, act } from "react";
import { render, screen } from "@testing-library/react";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";
import { ProjectSettingsPage } from "./project-settings-page";

let mockPageStateResolution: PageStateResolution = { kind: "ready" };
let mockIsOwner = false;

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/build/1/settings",
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "user-1" } },
    status: "authenticated",
  }),
}));

const MOCK_PROJECT = {
  id: 1,
  name: "Test Project",
  description: "",
  status: "ACTIVE",
  key: "TEST",
  members: [],
};

jest.mock("@/hooks/api/build", () => ({
  useProject: () => ({
    data: MOCK_PROJECT,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useUpdateProject: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockIsOwner,
  useCanState: () => (mockIsOwner ? "granted" : "denied"),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => mockPageStateResolution,
}));

jest.mock("@/hooks/api/invoices/project-invoice-line-detail", () => ({
  useProjectInvoiceLineDetail: () => ({
    data: { projectId: 1, invoiceLineDetail: "summary" as const },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useUpdateProjectInvoiceLineDetail: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
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
  LabelsSettings: () => null,
}));

jest.mock("@/features/build/settings/statuses-settings", () => ({
  StatusesSettings: () => null,
}));

jest.mock("@/features/build/settings/team-roster-section", () => ({
  TeamRosterSection: () => null,
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    children,
    loading,
  }: {
    resolution: PageStateResolution;
    children: React.ReactNode;
    loading?: React.ReactNode;
  }) => {
    if (resolution.kind === "loading") return <div data-testid="page-loading">{loading}</div>;
    if (resolution.kind === "denied") return <div data-testid="page-denied" />;
    if (resolution.kind === "error") return <div data-testid="page-error" />;
    return <div data-testid="page-ready">{children}</div>;
  },
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({
    children,
    solid: _solid,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
    solid?: boolean;
  }) => <div className={className}>{children}</div>,
  PmSection: ({
    children,
    index: _index,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
    index?: number;
  }) => <div className={className}>{children}</div>,
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

describe("project settings page — page-level state transitions", () => {
  beforeEach(() => {
    mockIsOwner = false;
  });

  describe("loading state", () => {
    beforeEach(() => {
      mockPageStateResolution = { kind: "loading" };
    });

    test("renders the loading skeleton instead of the project fields while the page is resolving", async () => {
      await renderPage();
      expect(screen.getByTestId("page-loading")).toBeInTheDocument();
      expect(screen.queryByTestId("page-ready")).not.toBeInTheDocument();
    });

    test("loading state does not render the project name input", async () => {
      await renderPage();
      expect(screen.queryByPlaceholderText("Enter project name")).not.toBeInTheDocument();
    });
  });

  describe("denied state", () => {
    beforeEach(() => {
      mockPageStateResolution = { kind: "denied", permission: "build:view" };
    });

    test("renders the denied view instead of the project fields when access is refused", async () => {
      await renderPage();
      expect(screen.getByTestId("page-denied")).toBeInTheDocument();
      expect(screen.queryByTestId("page-ready")).not.toBeInTheDocument();
    });

    test("denied state does not render the project name input so no existence is leaked", async () => {
      await renderPage();
      expect(screen.queryByPlaceholderText("Enter project name")).not.toBeInTheDocument();
    });
  });

  describe("error state", () => {
    beforeEach(() => {
      mockPageStateResolution = { kind: "error", error: new Error("fetch failed") };
    });

    test("renders the error view instead of the project fields when the data fetch fails", async () => {
      await renderPage();
      expect(screen.getByTestId("page-error")).toBeInTheDocument();
      expect(screen.queryByTestId("page-ready")).not.toBeInTheDocument();
    });

    test("error state does not render the project name input", async () => {
      await renderPage();
      expect(screen.queryByPlaceholderText("Enter project name")).not.toBeInTheDocument();
    });
  });

  describe("ready state", () => {
    beforeEach(() => {
      mockPageStateResolution = { kind: "ready" };
    });

    test("renders the project fields when the page resolves to ready", async () => {
      await renderPage();
      expect(screen.getByTestId("page-ready")).toBeInTheDocument();
    });

    test("the project name input is present in the ready state", async () => {
      await renderPage();
      expect(screen.getByPlaceholderText("Enter project name")).toBeInTheDocument();
    });
  });
});
