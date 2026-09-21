import { render, screen } from "@testing-library/react";
import { MeetingDetailPage } from "./meeting-detail-page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("@/hooks/api/build", () => ({
  useMeeting: jest.fn(),
  useUpdateMeeting: jest.fn(),
  useDeleteMeeting: jest.fn(),
  useProjectMembers: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {children}
    </div>
  ),
}));

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: ({ permission }: { permission?: string }) => (
    <div data-testid="no-permission">{permission}</div>
  ),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ description }: { description?: string }) => (
    <div data-testid="error-state">{description}</div>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_PANEL: "",
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({ trigger, onConfirm }: { trigger?: React.ReactNode; onConfirm?: () => void }) => (
    <div>
      {trigger}
      <button onClick={onConfirm}>Confirm Delete</button>
    </div>
  ),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@animateicons/react/lucide", () => ({
  Trash2Icon: ({ ref: _ref, ...props }: React.HTMLAttributes<HTMLElement>) => <span {...props} />,
}));

jest.mock("./meeting-badges", () => ({
  MeetingTypeBadge: () => null,
  MeetingStatusBadge: () => null,
}));

jest.mock("./meeting-form-sheet", () => ({
  MeetingFormSheet: () => null,
}));

jest.mock("./meeting-notes-section", () => ({
  MeetingNotesSection: () => null,
}));

jest.mock("./attendees-section", () => ({
  AttendeesSection: () => null,
}));

jest.mock("./action-items-section", () => ({
  ActionItemsSection: () => null,
}));

jest.mock("./standup-panel", () => ({
  StandupPanel: () => null,
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : "Error"),
}));

import { useMeeting, useUpdateMeeting, useDeleteMeeting, useProjectMembers } from "@/hooks/api/build";
import { useCan, useAccess } from "@/hooks/api/access";

const mockUseMeeting = useMeeting as jest.Mock;
const mockUseUpdateMeeting = useUpdateMeeting as jest.Mock;
const mockUseDeleteMeeting = useDeleteMeeting as jest.Mock;
const mockUseProjectMembers = useProjectMembers as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:meetings:view": "all", "build:meetings:manage": "all" }, modules: {} },
  isLoading: false,
};

const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};

function baseMeetingResult(overrides = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseMeeting.mockReturnValue(baseMeetingResult());
  mockUseUpdateMeeting.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseDeleteMeeting.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseProjectMembers.mockReturnValue({ data: [] });
});

it("renders denied state when build:meetings:view is not in the access snapshot", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  render(<MeetingDetailPage projectId={1} meetingId={1} />);
  expect(screen.getByTestId("no-permission")).toHaveTextContent("build:meetings:view");
});

it("shows the loading skeleton and not a denial while the access snapshot is still in flight because useCan answers false before it lands", () => {
  mockUseAccess.mockReturnValue({ data: undefined, isLoading: true });
  mockUseCan.mockReturnValue(false);
  render(<MeetingDetailPage projectId={1} meetingId={1} />);
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
  expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
});

it("renders the plan upgrade link the backend sent with a 402 MODULE_NOT_ENABLED instead of a generic error", () => {
  mockUseMeeting.mockReturnValue(
    baseMeetingResult({
      isError: true,
      error: new ApiError(
        "Build is not included in your current plan.",
        402,
        "MODULE_NOT_ENABLED",
        { moduleKey: "build", reason: "not-in-plan", upgradePath: "/settings/billing" },
      ),
    }),
  );
  render(<MeetingDetailPage projectId={1} meetingId={1} />);
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /view plans/i })).toHaveAttribute("href", "/settings/billing");
});
