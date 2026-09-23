import { Suspense, act } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProjectSettingsPage } from "./project-settings-page";

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
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

let mockIsOwner = false;

jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockIsOwner,
  useCanState: () => (mockIsOwner ? "granted" : "denied"),
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
  useUpdateProjectInvoiceLineDetail: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}));

jest.mock("@/features/build/settings/project-members-section", () => ({
  MembersSelector: () => <div data-testid="members-selector" />,
  ReassignDialog: () => null,
  DangerZoneSection: () => <div data-testid="danger-zone-section" />,
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

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
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

describe("project settings section URL param (BLD-L4-002)", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockSearchParams = new URLSearchParams();
    mockIsOwner = false;
  });

  describe("section param round-trip", () => {
    test("default section is general when no section param in URL", async () => {
      await renderPage();
      expect(screen.getByPlaceholderText("Enter project name")).toBeInTheDocument();
      expect(screen.queryByTestId("labels-content")).not.toBeInTheDocument();
    });

    test("clicking labels section updates the URL via router.replace with section=labels", async () => {
      await renderPage();
      const labelsButton = screen.getByRole("button", { name: "Labels" });
      await act(async () => {
        fireEvent.click(labelsButton);
      });
      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining("section=labels"),
        { scroll: false },
      );
    });

    test("section=labels in URL renders the labels section", async () => {
      mockSearchParams = new URLSearchParams("section=labels");
      await renderPage();
      expect(screen.getByTestId("labels-content")).toBeInTheDocument();
      expect(screen.queryByPlaceholderText("Enter project name")).not.toBeInTheDocument();
    });

    test("unknown section param falls back to general", async () => {
      mockSearchParams = new URLSearchParams("section=nonexistent-section");
      await renderPage();
      expect(screen.getByPlaceholderText("Enter project name")).toBeInTheDocument();
    });

    test("clicking general section updates URL via router.replace with section=general", async () => {
      mockSearchParams = new URLSearchParams("section=labels");
      await renderPage();
      const generalButton = screen.getByRole("button", { name: "General" });
      await act(async () => {
        fireEvent.click(generalButton);
      });
      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining("section=general"),
        { scroll: false },
      );
    });
  });

  describe("danger section owner gate", () => {
    test("danger section is not reachable by deep link for a non-owner: section=danger renders general instead", async () => {
      mockIsOwner = false;
      mockSearchParams = new URLSearchParams("section=danger");
      await renderPage();
      expect(screen.queryByText("Danger Zone")).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter project name")).toBeInTheDocument();
    });

    test("owner can reach danger section via deep link: section=danger renders the danger panel", async () => {
      mockIsOwner = true;
      mockSearchParams = new URLSearchParams("section=danger");
      await renderPage();
      expect(screen.getByTestId("danger-zone-section")).toBeInTheDocument();
    });

    test("danger section button is not shown to a non-owner so they cannot click it", async () => {
      mockIsOwner = false;
      await renderPage();
      expect(screen.queryByRole("button", { name: "Danger Zone" })).not.toBeInTheDocument();
    });

    test("danger section button is shown to an owner so they can navigate to it", async () => {
      mockIsOwner = true;
      await renderPage();
      expect(screen.getByRole("button", { name: "Danger Zone" })).toBeInTheDocument();
    });
  });
});
