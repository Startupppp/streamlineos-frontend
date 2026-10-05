import { render, screen, fireEvent } from "@testing-library/react";
import "./client-portal-management-page-test-harness";
import {
  mockUsePageState,
  mockUsePortalSettings,
  mockIsApiError,
  mockUsePortalPreview,
  currentSearchRef,
  mockReplace,
} from "./client-portal-management-page-test-harness";
import {
  installClientPortalMocks,
  UNPUBLISHED_SETTINGS,
  baseQuery,
} from "./client-portal-management-page-test-fixtures";
import { ClientPortalManagementPage } from "./client-portal-management-page";

beforeEach(installClientPortalMocks);

describe("ClientPortalManagementPage — tab navigation writes the section param (FE-86, BUG-047)", () => {
  it("clicking Visibility sets section=visibility in the URL so the tab survives a reload (FE-86 positive)", () => {
    render(<ClientPortalManagementPage projectId={1} />);
    fireEvent.click(screen.getByRole("tab", { name: /Visibility/i }));
    const target = mockReplace.mock.calls.at(-1)?.[0] as string;
    expect(target).toContain("section=visibility");
    expect(target).not.toContain("section=grants");
  });

  it("NEGATIVE — clicking Grants removes the section param so the default tab has a clean URL (FE-86, BUG-047 negative)", () => {
    currentSearchRef.current = new URLSearchParams("section=visibility");
    render(<ClientPortalManagementPage projectId={1} />);
    fireEvent.click(screen.getByRole("tab", { name: /Grants/i }));
    const target = mockReplace.mock.calls.at(-1)?.[0] as string;
    expect(target).not.toContain("section=");
    expect(target).not.toMatch(/\?$/);
  });

  it("clicking Preview sets section=preview and does not leave a trailing question mark", () => {
    render(<ClientPortalManagementPage projectId={1} />);
    fireEvent.click(screen.getByRole("tab", { name: /Preview/i }));
    const target = mockReplace.mock.calls.at(-1)?.[0] as string;
    expect(target).toContain("section=preview");
    expect(target).not.toMatch(/\?$/);
  });

  it("active tab defaults to grants when the URL carries no section param", () => {
    render(<ClientPortalManagementPage projectId={1} />);
    const activeTabEl = document.querySelector("[data-active-tab]");
    expect(activeTabEl?.getAttribute("data-active-tab")).toBe("grants");
  });

  it("active tab reflects section=preview from the URL on mount, so a deep-linked preview tab renders immediately", () => {
    currentSearchRef.current = new URLSearchParams("section=preview");
    render(<ClientPortalManagementPage projectId={1} />);
    const activeTabEl = document.querySelector("[data-active-tab]");
    expect(activeTabEl?.getAttribute("data-active-tab")).toBe("preview");
  });
});

describe("ClientPortalManagementPage — client actor isolation: portal client cannot reach internal management (BT-716b46bf3292)", () => {
  it("hides the publication banner when pageState is denied so a portal-only actor cannot see the portal settings panel", () => {
    mockUsePageState.mockReturnValue({ kind: "denied" });
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.queryByText("Portal not published")).toBeNull();
    expect(screen.queryByText("Portal published")).toBeNull();
  });

  it("NEGATIVE — renders the publication banner when pageState is ready confirming the denied case is permission-specific and not a render bug", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: UNPUBLISHED_SETTINGS }));
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getByText("Portal not published")).toBeInTheDocument();
  });
});

describe("ClientPortalManagementPage — preview section 404 vs generic error (FE-78, FE-122)", () => {
  it("shows 'No portal published yet' when the preview returns a 404 (no active grant)", () => {
    const err = { status: 404 };
    mockIsApiError.mockImplementation((e) => e === err);
    mockUsePortalPreview.mockReturnValue(baseQuery({ isError: true, error: err }));
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getByText("No portal published yet")).toBeInTheDocument();
  });

  it("NEGATIVE — shows 'Preview unavailable' for a non-404 API error, not the no-grant message", () => {
    const err = { status: 500 };
    mockIsApiError.mockImplementation((e) => e === err);
    mockUsePortalPreview.mockReturnValue(baseQuery({ isError: true, error: err }));
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getByText("Preview unavailable")).toBeInTheDocument();
    expect(screen.queryByText("No portal published yet")).toBeNull();
  });
});
