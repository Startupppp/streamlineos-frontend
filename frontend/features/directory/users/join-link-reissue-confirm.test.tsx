import type { ReactNode } from "react";
import { act, render, screen, within } from "@testing-library/react";
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
type ResendOutcome = {
  success: true;
  deliveryQueued: boolean;
  deliveryFailureReason: string | null;
};
type ResendOptions = { onSuccess: (result: ResendOutcome) => void };
type WarningOptions = {
  description: string;
  action: { label: string; onClick: () => void };
};
const resendInvite = jest.fn<void, [string, ResendOptions]>();
const toastSuccess = jest.fn();
const toastWarning = jest.fn<void, [string, WarningOptions]>();

jest.mock("@/hooks/api/access", () => ({
  usePermissionGate: () => ({
    permission: "settings:organization:manage",
    allowed: true,
    denied: false,
    pending: false,
    unavailable: false,
  }),
  useCanManageOrganizationMembership: () => true,
  useAccess: () => ({ refetch: jest.fn() }),
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
          declinedAt: null,
          moduleAccess: [],
          deliveryFailed: false,
        } satisfies Partial<Invitation> as Invitation,
      ],
      pagination: { limit: 20, hasMore: false, nextCursor: null },
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useResendInvite: () => ({ mutate: resendInvite, isPending: false, variables: undefined }),
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
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    warning: (message: string, options: WarningOptions) => toastWarning(message, options),
    error: jest.fn(),
    message: jest.fn(),
  },
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
    resendInvite.mockClear();
    toastSuccess.mockClear();
    toastWarning.mockClear();
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

describe("resending an invitation reports queue state", () => {
  beforeEach(() => {
    resendInvite.mockClear();
    reissueJoinLink.mockClear();
    toastSuccess.mockClear();
    toastWarning.mockClear();
  });

  async function resend(): Promise<ResendOptions> {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: "Resend invitation to a2@example.test" }));
    const call = resendInvite.mock.calls[0];
    if (!call) throw new Error("The resend action was not called");
    expect(call[0]).toBe("inv-1");
    return call[1];
  }

  it("states that email was queued and delivery is still pending", async () => {
    const options = await resend();
    act(() => options.onSuccess({
      success: true,
      deliveryQueued: true,
      deliveryFailureReason: null,
    }));

    expect(toastSuccess).toHaveBeenCalledWith(
      "Invitation link renewed; email queued",
      { description: "Delivery is not yet confirmed. Check status before assuming it arrived." },
    );
    expect(toastWarning).not.toHaveBeenCalled();
    expect(reissueJoinLink).not.toHaveBeenCalled();
  });

  it("explains a missing provider and opens the existing confirmation before link reissue", async () => {
    const options = await resend();
    act(() => options.onSuccess({
      success: true,
      deliveryQueued: false,
      deliveryFailureReason: "No email provider is configured, so the email could not be sent.",
    }));

    const warning = toastWarning.mock.calls[0];
    if (!warning) throw new Error("The queue failure warning was not shown");
    expect(warning[0]).toBe("Invitation link renewed, but email was not queued");
    expect(warning[1].description).toMatch(/configure delivery before resending/i);
    expect(warning[1].action.label).toBe("Review link option");
    expect(reissueJoinLink).not.toHaveBeenCalled();

    act(() => warning[1].action.onClick());
    expect(await screen.findByRole("alertdialog")).toHaveTextContent(/stop working/i);
    expect(reissueJoinLink).not.toHaveBeenCalled();
  });

  it("gives controlled suppression guidance without claiming that email was sent", async () => {
    const options = await resend();
    act(() => options.onSuccess({
      success: true,
      deliveryQueued: false,
      deliveryFailureReason:
        "The address is on the email suppression list after a bounce or unsubscribe, so no email was sent.",
    }));

    const warning = toastWarning.mock.calls[0];
    if (!warning) throw new Error("The queue failure warning was not shown");
    expect(warning[1].description).toMatch(/review the suppression before another email attempt/i);
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("keeps an unknown delivery diagnostic out of the user message", async () => {
    const options = await resend();
    act(() => options.onSuccess({
      success: true,
      deliveryQueued: false,
      deliveryFailureReason: "smtp-password=private-value",
    }));

    const warning = toastWarning.mock.calls[0];
    if (!warning) throw new Error("The queue failure warning was not shown");
    expect(warning[1].description).toMatch(/check email delivery settings/i);
    expect(warning[1].description).not.toContain("private-value");
  });
});
