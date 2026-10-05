import { render, screen, fireEvent } from "@testing-library/react";
import "./client-portal-management-page-test-harness";
import { mockUseCan, mockUsePortalSettings, mockUsePublishPortal, mockUseUnpublishPortal } from "./client-portal-management-page-test-harness";
import {
  installClientPortalMocks,
  UNPUBLISHED_SETTINGS,
  PUBLISHED_SETTINGS,
  baseQuery,
  baseMutation,
} from "./client-portal-management-page-test-fixtures";
import { ClientPortalManagementPage } from "./client-portal-management-page";

beforeEach(installClientPortalMocks);

describe("ClientPortalManagementPage — publication state banner", () => {
  it("shows 'Portal not published' when portalPublishedAt is null", () => {
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: UNPUBLISHED_SETTINGS }));
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getByText("Portal not published")).toBeInTheDocument();
  });

  it("shows 'Portal published' when portalPublishedAt is set", () => {
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: PUBLISHED_SETTINGS }));
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getByText("Portal published")).toBeInTheDocument();
  });

  it("NEGATIVE — 'Portal published' does not appear when portal is unpublished", () => {
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: UNPUBLISHED_SETTINGS }));
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.queryByText("Portal published")).toBeNull();
  });
});

describe("ClientPortalManagementPage — Switch state reflects publication", () => {
  it("Switch is unchecked when portal is not published", () => {
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: UNPUBLISHED_SETTINGS }));
    render(<ClientPortalManagementPage projectId={1} />);
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("Switch is checked when portal is published", () => {
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: PUBLISHED_SETTINGS }));
    render(<ClientPortalManagementPage projectId={1} />);
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("Switch is disabled when canManage is false so mutation control fails closed (FE-44)", () => {
    mockUseCan.mockReturnValue(false);
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: UNPUBLISHED_SETTINGS }));
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getByRole("switch")).toBeDisabled();
  });

  it("NEGATIVE — Switch is not disabled when canManage is true and nothing is pending", () => {
    mockUseCan.mockReturnValue(true);
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: UNPUBLISHED_SETTINGS }));
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getByRole("switch")).not.toBeDisabled();
  });
});

describe("ClientPortalManagementPage — publish flow", () => {
  it("clicking the Switch on an unpublished portal calls publishMutation.mutate immediately (no confirm)", () => {
    const publishMutate = jest.fn();
    mockUsePublishPortal.mockReturnValue(baseMutation({ mutate: publishMutate }));
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: UNPUBLISHED_SETTINGS }));
    render(<ClientPortalManagementPage projectId={1} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(publishMutate).toHaveBeenCalledTimes(1);
  });

  it("NEGATIVE — unpublishMutation.mutate is not called when publishing (no confirm dialog appears)", () => {
    const unpublishMutate = jest.fn();
    mockUseUnpublishPortal.mockReturnValue(baseMutation({ mutate: unpublishMutate }));
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: UNPUBLISHED_SETTINGS }));
    render(<ClientPortalManagementPage projectId={1} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(unpublishMutate).not.toHaveBeenCalled();
  });
});

describe("ClientPortalManagementPage — unpublish confirms destructively", () => {
  it("clicking Switch on a published portal opens the ConfirmDialog (destructive path)", () => {
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: PUBLISHED_SETTINGS }));
    render(<ClientPortalManagementPage projectId={1} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("confirming unpublish calls unpublishMutation.mutate", () => {
    const unpublishMutate = jest.fn();
    mockUseUnpublishPortal.mockReturnValue(baseMutation({ mutate: unpublishMutate }));
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: PUBLISHED_SETTINGS }));
    render(<ClientPortalManagementPage projectId={1} />);
    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByText("Confirm"));
    expect(unpublishMutate).toHaveBeenCalledTimes(1);
  });

  it("NEGATIVE — cancelling the confirm dialog does not call unpublishMutation.mutate", () => {
    const unpublishMutate = jest.fn();
    mockUseUnpublishPortal.mockReturnValue(baseMutation({ mutate: unpublishMutate }));
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: PUBLISHED_SETTINGS }));
    render(<ClientPortalManagementPage projectId={1} />);
    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(unpublishMutate).not.toHaveBeenCalled();
  });
});
