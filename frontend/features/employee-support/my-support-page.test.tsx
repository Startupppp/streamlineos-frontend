import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const mockUseAccess = jest.fn();
const mockUseCan = jest.fn();
const mockUseMySupportRequests = jest.fn();

function queryOf(overrides: Record<string, unknown>) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    isSuccess: false,
    error: null,
    refetch: jest.fn(),
    ...overrides,
  };
}

const memberAccess = {
  data: { isOrgOwner: false, scopes: { "self:support": "own" }, modules: {} },
  isLoading: false,
};

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/me/support",
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => mockUseAccess(),
  useCan: (key: string) => mockUseCan(key),
  useModuleEnabled: () => true,
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/employee-self-service/support", () => ({
  useMySupportRequests: () => mockUseMySupportRequests(),
  useMySupportRequest: () => ({ data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() }),
  useAddMySupportComment: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("./create-request-dialog", () => ({
  CreateRequestDialog: ({ open }: { open: boolean }) => (open ? <div data-testid="create-request-dialog" /> : null),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title, actions }: { children?: ReactNode; title?: string; actions?: ReactNode }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      <div data-testid="actions">{actions}</div>
      {children}
    </div>
  ),
}));

import { MySupportPage } from "./my-support-page";

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAccess.mockReturnValue(memberAccess);
  mockUseCan.mockImplementation((key: string) => key === "self:support");
  mockUseMySupportRequests.mockReturnValue(queryOf({ isLoading: true }));
});

describe("MySupportPage — the employee's own requests", () => {
  it("keeps the title and typed column headers while loading, with no numbered placeholders", () => {
    render(<MySupportPage />);

    expect(screen.getByRole("heading", { name: /employee support/i })).toBeInTheDocument();
    for (const header of ["Request", "Category", "Status", "Priority", "SLA", "Created"])
      expect(screen.getByRole("columnheader", { name: header })).toBeInTheDocument();
    expect(screen.queryByText(/column 1/i)).toBeNull();
  });

  it("shows an empty state whose one action creates a request", () => {
    mockUseMySupportRequests.mockReturnValue(
      queryOf({ isSuccess: true, data: { data: [], pagination: { limit: 20, hasMore: false, nextCursor: null } } }),
    );

    render(<MySupportPage />);

    expect(screen.getByText("No requests yet")).toBeInTheDocument();
    const [createButton] = screen.getAllByRole("button", { name: /create request/i });
    expect(createButton).toBeDefined();
    if (createButton) fireEvent.click(createButton);
    expect(screen.getByTestId("create-request-dialog")).toBeInTheDocument();
  });

  it("shows the confidential badge on a confidential request", () => {
    mockUseMySupportRequests.mockReturnValue(
      queryOf({
        isSuccess: true,
        data: {
          data: [
            {
              id: 5,
              orgId: "org1",
              userId: "u1",
              userMembershipId: 1,
              title: "Harassment concern",
              description: null,
              category: "policy_question",
              queue: "HR",
              priority: "URGENT",
              status: "IN_PROGRESS",
              assigneeId: null,
              assigneeMembershipId: null,
              assigneeName: null,
              isConfidential: true,
              firstResponseDueAt: null,
              firstRespondedAt: null,
              slaDueAt: null,
              escalatedAt: null,
              escalationLevel: 0,
              resolvedAt: null,
              resolution: null,
              createdAt: "2026-09-21T09:00:00.000Z",
              updatedAt: "2026-09-21T09:00:00.000Z",
              authorName: "Me",
              authorImage: null,
            },
          ],
          pagination: { limit: 20, hasMore: false, nextCursor: null },
        },
      }),
    );

    render(<MySupportPage />);

    expect(screen.getByText("Harassment concern")).toBeInTheDocument();
    expect(screen.getByText("Confidential")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
  });

  it("shows the error state with a retry when the read fails", () => {
    const refetch = jest.fn();
    mockUseMySupportRequests.mockReturnValue(queryOf({ isError: true, error: new Error("offline"), refetch }));

    render(<MySupportPage />);

    expect(screen.getByText("offline")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again|retry/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("shows the no-permission state, never an empty list, when self:support is withheld", () => {
    mockUseAccess.mockReturnValue({ data: { isOrgOwner: false, scopes: {}, modules: {} }, isLoading: false });
    mockUseCan.mockReturnValue(false);

    render(<MySupportPage />);

    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
    expect(screen.queryByText("No requests yet")).toBeNull();
  });
});
