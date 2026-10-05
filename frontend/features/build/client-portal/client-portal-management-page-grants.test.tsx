import { render, screen, fireEvent } from "@testing-library/react";
import "./client-portal-management-page-test-harness";
import {
  mockUseCan,
  mockUsePageState,
  mockUsePortalSettings,
  mockUseProjectClientGrants,
  mockRevokeMutate,
  mockUseRevokeGrant,
  currentSearchRef,
  mockReplace,
} from "./client-portal-management-page-test-harness";
import {
  installClientPortalMocks,
  UNPUBLISHED_SETTINGS,
  GRANTS_PAGE,
  SAMPLE_GRANT,
  baseQuery,
} from "./client-portal-management-page-test-fixtures";
import { ClientPortalManagementPage } from "./client-portal-management-page";

beforeEach(installClientPortalMocks);

describe("ClientPortalManagementPage — grants tab", () => {
  it("shows 'No grants' empty state when grant list is empty", () => {
    mockUseProjectClientGrants.mockReturnValue(
      baseQuery({ data: { data: [], pagination: { limit: 50, nextCursor: null, hasMore: false } } }),
    );
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getAllByText("No grants").length).toBeGreaterThan(0);
  });

  it("shows grant contact name when grants exist", () => {
    mockUseProjectClientGrants.mockReturnValue(baseQuery({ data: GRANTS_PAGE }));
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("opens the shortcut help dialog when ? is pressed, so the shortcut has a target instead of setting dead state", () => {
    mockUseProjectClientGrants.mockReturnValue(baseQuery({ data: GRANTS_PAGE }));
    render(<ClientPortalManagementPage projectId={1} />);

    expect(screen.queryByText("Keyboard shortcuts")).toBeNull();
    fireEvent.keyDown(document, { key: "?" });
    expect(screen.getByText("Keyboard shortcuts")).toBeInTheDocument();
  });

  it("offers a revoke control on an active grant when the viewer holds build:clientvisibility:manage", () => {
    mockUseCan.mockReturnValue(true);
    mockUseProjectClientGrants.mockReturnValue(baseQuery({ data: GRANTS_PAGE }));
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getByRole("button", { name: "Revoke" })).toBeInTheDocument();
  });

  it("NEGATIVE — offers no revoke control when the viewer lacks build:clientvisibility:manage, so the control fails closed (FE-44)", () => {
    mockUseCan.mockReturnValue(false);
    mockUseProjectClientGrants.mockReturnValue(baseQuery({ data: GRANTS_PAGE }));
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revoke" })).toBeNull();
  });

  it("NEGATIVE — offers no revoke control on an already revoked grant, because revoking twice is not an action", () => {
    mockUseCan.mockReturnValue(true);
    mockUseProjectClientGrants.mockReturnValue(
      baseQuery({
        data: {
          ...GRANTS_PAGE,
          data: [{ ...SAMPLE_GRANT, status: "REVOKED" }],
        },
      }),
    );
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.queryByRole("button", { name: "Revoke" })).toBeNull();
  });

  it("confirms through a destructive ConfirmDialog before revoking, and does not revoke on the click alone (FE-83)", () => {
    mockUseCan.mockReturnValue(true);
    mockUseProjectClientGrants.mockReturnValue(baseQuery({ data: GRANTS_PAGE }));
    render(<ClientPortalManagementPage projectId={1} />);

    fireEvent.click(screen.getByRole("button", { name: "Revoke" }));
    expect(mockRevokeMutate).not.toHaveBeenCalled();
    expect(
      screen.getByRole("dialog", { name: "Revoke portal access?" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(mockRevokeMutate).toHaveBeenCalledTimes(1);
  });

  it("revokes the grant the row belongs to, not some other grant in the list", () => {
    mockUseCan.mockReturnValue(true);
    mockUseProjectClientGrants.mockReturnValue(baseQuery({ data: GRANTS_PAGE }));
    render(<ClientPortalManagementPage projectId={1} />);
    expect(mockUseRevokeGrant).toHaveBeenCalledWith(
      SAMPLE_GRANT.projectClientGrantId,
    );
  });

  it("NEGATIVE — grant name is absent when grants list is empty", () => {
    mockUseProjectClientGrants.mockReturnValue(
      baseQuery({ data: { data: [], pagination: { limit: 50, nextCursor: null, hasMore: false } } }),
    );
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.queryByText("Jane Smith")).toBeNull();
  });
});

describe("ClientPortalManagementPage — error + loading states do not render banner content (FE-40)", () => {
  it("when page state is not ready, the publication banner is absent", () => {
    mockUsePageState.mockReturnValue({ kind: "error" });
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("NEGATIVE — when page state is ready, Switch is present", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: UNPUBLISHED_SETTINGS }));
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });
});

describe("ClientPortalManagementPage — URL-backed grant filter axes (FE-86)", () => {
  function lastGrantParams() {
    const calls = mockUseProjectClientGrants.mock.calls;
    return calls[calls.length - 1]?.[0] as Record<string, unknown> | undefined;
  }

  it("sends no filter axis to the grants read when the URL carries none", () => {
    render(<ClientPortalManagementPage projectId={1} />);
    expect(lastGrantParams()).toEqual({
      projectId: 1,
      cursor: undefined,
      grantId: undefined,
      from: undefined,
      to: undefined,
      state: undefined,
    });
  });

  it("forwards grantId, from, to, status and cursor from the URL to the grants read", () => {
    currentSearchRef.current = new URLSearchParams(
      "grantId=grant-abc-123&from=2026-01-01&to=2026-06-30&status=active&cursor=cur-2",
    );
    render(<ClientPortalManagementPage projectId={1} />);
    expect(lastGrantParams()).toEqual({
      projectId: 1,
      cursor: "cur-2",
      grantId: "grant-abc-123",
      from: "2026-01-01",
      to: "2026-06-30",
      state: "active",
    });
  });

  it("drops an unknown status value rather than sending it, so a bookmarked URL cannot 400 the strict backend schema", () => {
    currentSearchRef.current = new URLSearchParams("status=NOT_A_STATE");
    render(<ClientPortalManagementPage projectId={1} />);
    expect(lastGrantParams()?.state).toBeUndefined();
  });

  it("distinguishes a filtered no-result state from first-run emptiness", () => {
    currentSearchRef.current = new URLSearchParams("status=revoked");
    mockUseProjectClientGrants.mockReturnValue(
      baseQuery({ data: { data: [], pagination: { limit: 50, nextCursor: null, hasMore: false } } }),
    );
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getAllByText("No matching grants").length).toBeGreaterThan(0);
    expect(screen.queryByText("No grants")).toBeNull();
  });

  it("NEGATIVE — with no filter in the URL the empty state is the first-run one, not the filtered one", () => {
    mockUseProjectClientGrants.mockReturnValue(
      baseQuery({ data: { data: [], pagination: { limit: 50, nextCursor: null, hasMore: false } } }),
    );
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getAllByText("No grants").length).toBeGreaterThan(0);
    expect(screen.queryByText("No matching grants")).toBeNull();
  });
});

describe("ClientPortalManagementPage — grants cursor pagination writes the URL", () => {
  it("advances by writing the next cursor into the URL rather than growing the mounted list (FE-125)", () => {
    mockUseProjectClientGrants.mockReturnValue(
      baseQuery({
        data: {
          data: [SAMPLE_GRANT],
          pagination: { limit: 50, nextCursor: "cur-next", hasMore: true },
        },
      }),
    );
    render(<ClientPortalManagementPage projectId={1} />);
    fireEvent.click(screen.getByText("Next"));
    const target = mockReplace.mock.calls.at(-1)?.[0] as string;
    expect(target).toContain("cursor=cur-next");
  });

  it("NEGATIVE — Next is disabled on the last page, so there is no cursor write", () => {
    mockUseProjectClientGrants.mockReturnValue(baseQuery({ data: GRANTS_PAGE }));
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getByText("Next")).toBeDisabled();
    fireEvent.click(screen.getByText("Next"));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("returns to the unpaged URL from page two, so Previous is recoverable on reload", () => {
    currentSearchRef.current = new URLSearchParams("cursor=cur-2");
    mockUseProjectClientGrants.mockReturnValue(
      baseQuery({
        data: {
          data: [SAMPLE_GRANT],
          pagination: { limit: 50, nextCursor: "cur-3", hasMore: true },
        },
      }),
    );
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getByTestId("cursor-page-controls")).toHaveAttribute("data-page", "2");
    fireEvent.click(screen.getByText("Previous"));
    const target = mockReplace.mock.calls.at(-1)?.[0] as string;
    expect(target).not.toContain("cursor=");
  });

  it("renders no pager when there are no grants at all", () => {
    mockUseProjectClientGrants.mockReturnValue(
      baseQuery({ data: { data: [], pagination: { limit: 50, nextCursor: null, hasMore: false } } }),
    );
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.queryByTestId("cursor-page-controls")).toBeNull();
  });
});
