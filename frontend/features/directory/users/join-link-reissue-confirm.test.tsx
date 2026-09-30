import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Invitation } from "@/hooks/api/users/types";

/**
 * BUG-HRMS-004. Copying a join link REISSUES it, which kills the link already in the
 * recipient's inbox. That fact was a tooltip on an icon button: one click, no
 * confirmation, and the invitee's emailed link silently stopped working.
 *
 * The reissue must not happen until it is confirmed, and dismissing must leave the
 * existing link alone — that second case is the point, because the whole defect is a
 * destructive act with no way to decline it.
 */

const router = { replace: jest.fn(), push: jest.fn() };
jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => router,
  usePathname: () => "/settings/users",
}));

const reissueJoinLink = jest.fn().mockResolvedValue({
  joinUrl: "https://app.test/invitation/new-token",
  email: "a2@example.test",
});

jest.mock("@/hooks/api/access", () => ({
  usePermissionGate: () => ({
    permission: "settings:organization:manage",
    allowed: true,
    denied: false,
    pending: false,
    unavailable: false,
  }),
  useCanManageOrganizationMembership: () => true,
}));

jest.mock("@/hooks/api/users", () => ({
  useInvitations: () => ({
    data: {
      data: [
        {
          id: "inv-1",
          email: "a2@example.test",
          role: "MEMBER",
          expiresAt: "2030-01-01T00:00:00.000Z",
          acceptedAt: null,
          createdAt: "2026-09-01T10:00:00.000Z",
          status: "PENDING",
          revokedAt: null,
        } satisfies Partial<Invitation> as Invitation,
      ],
      pagination: { limit: 20, hasMore: false, nextCursor: null },
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useResendInvite: () => ({ mutate: jest.fn(), isPending: false, variables: undefined }),
  useReissueInvitationJoinLink: () => ({
    mutateAsync: reissueJoinLink,
    isPending: false,
    variables: undefined,
  }),
  useCancelInvitation: () => ({ mutate: jest.fn(), isPending: false }),
  useChangeInvitationRole: () => ({ mutate: jest.fn(), isPending: false, variables: undefined }),
}));

jest.mock("./user-invite-dialog", () => ({ UserInviteDialog: () => null }));
jest.mock("./people-section-tabs", () => ({ PeopleSectionTabs: () => <div>tabs</div> }));
jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, ...rest }: { children: ReactNode }) => (
    <button type="button" {...rest}>{children}</button>
  ),
  SelectValue: () => <span>status</span>,
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), message: jest.fn() },
}));

import { TooltipProvider } from "@/components/ui/tooltip";
import { UserInvitationsPanel } from "./user-invitations-panel";

function renderPanel() {
  render(
    <TooltipProvider>
      <UserInvitationsPanel />
    </TooltipProvider>,
  );
}

describe("copying a join link asks before it replaces the emailed one", () => {
  beforeEach(() => {
    reissueJoinLink.mockClear();
  });

  it("reissues nothing until the replacement is confirmed", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: /copy join link for a2@example.test/i }));

    expect(reissueJoinLink).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(/stop working/i);

    await user.click(screen.getByRole("button", { name: /copy a new link/i }));
    expect(reissueJoinLink).toHaveBeenCalledWith("inv-1");
  });

  it("leaves the emailed link alone when the dialog is dismissed", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: /copy join link for a2@example.test/i }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    expect(reissueJoinLink).not.toHaveBeenCalled();
  });
});
