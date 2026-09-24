import { Suspense, act } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  DirtyStateProvider,
  useHasUnsavedWork,
} from "@/components/shared/dirty-state-context";
import { ProjectSettingsPage } from "./project-settings-page";

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
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
  description: "A test project",
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
  useCan: () => false,
  useCanState: () => "denied" as const,
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

jest.mock("@/features/build/settings/project-member-selector", () => ({
  MembersSelector: () => <div data-testid="members-selector" />,
  ReassignDialog: () => null,
}));

jest.mock("@/features/build/settings/danger-zone-section", () => ({
  DangerZoneSection: () => null,
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

function HasUnsavedWorkProbe() {
  const hasUnsavedWork = useHasUnsavedWork();
  return (
    <span data-testid="probe">{hasUnsavedWork ? "dirty" : "clean"}</span>
  );
}

async function renderHarness() {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <DirtyStateProvider>
          <HasUnsavedWorkProbe />
          <ProjectSettingsPage params={Promise.resolve({ projectId: "1" })} />
        </DirtyStateProvider>
      </Suspense>,
    );
  });
}

describe("project settings form dirty guard (BSN-04-010, BSN-04-013)", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  test("dirty state is clean when form first loads with project data", async () => {
    await renderHarness();
    await waitFor(() => screen.getByPlaceholderText("Enter project name"));
    expect(screen.getByTestId("probe")).toHaveTextContent("clean");
  });

  test("editing project name registers the form as dirty so scope-change guard fires", async () => {
    await renderHarness();
    await waitFor(() => screen.getByPlaceholderText("Enter project name"));

    act(() => {
      fireEvent.change(screen.getByPlaceholderText("Enter project name"), {
        target: { value: "Updated Name" },
      });
    });

    await waitFor(() =>
      expect(screen.getByTestId("probe")).toHaveTextContent("dirty"),
    );
  });

  test("form values are preserved when user keeps editing instead of discarding after a blocked scope change", async () => {
    await renderHarness();
    await waitFor(() => screen.getByPlaceholderText("Enter project name"));

    act(() => {
      fireEvent.change(screen.getByPlaceholderText("Enter project name"), {
        target: { value: "Kept Name" },
      });
    });

    await waitFor(() =>
      expect(screen.getByTestId("probe")).toHaveTextContent("dirty"),
    );

    expect(
      (screen.getByPlaceholderText("Enter project name") as HTMLInputElement)
        .value,
    ).toBe("Kept Name");
  });
});
