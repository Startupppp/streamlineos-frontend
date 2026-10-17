import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeedbucketSubmissionDetail } from "./feedbucket-submission-detail";

const mockUsePageState = jest.fn();
const mockUseFeedbucketSubmission = jest.fn();
const mockUseUpdateFeedbucketSubmission = jest.fn();
const mockUseDeleteFeedbucketSubmission = jest.fn();
const mockUseDeleteFeedbucketSubmissionMedia = jest.fn();
const mockUseCan = jest.fn();

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: unknown[]) => mockUsePageState(...args),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    children,
    loading,
    empty,
    onRetry,
  }: {
    resolution: { kind: string; permission?: string };
    children?: React.ReactNode;
    loading?: React.ReactNode;
    empty?: React.ReactNode;
    onRetry?: () => void;
  }) => {
    if (resolution?.kind === "loading") return loading ?? null;
    if (resolution?.kind === "denied")
      return (
        <div
          data-testid="no-permission"
          data-permission={resolution.permission}
        />
      );
    if (resolution?.kind === "error")
      return <button onClick={onRetry}>retry</button>;
    if (resolution?.kind === "empty") return empty ?? null;
    return <>{children}</>;
  },
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/hooks/api/feedbucket/use-feedbucket-submissions", () => ({
  useFeedbucketSubmission: (id: number) => mockUseFeedbucketSubmission(id),
  useUpdateFeedbucketSubmission: () => mockUseUpdateFeedbucketSubmission(),
  useDeleteFeedbucketSubmission: () => mockUseDeleteFeedbucketSubmission(),
  useDeleteFeedbucketSubmissionMedia: () => mockUseDeleteFeedbucketSubmissionMedia(),
  useConvertFeedbucketToTicket: () => ({ isPending: false, mutateAsync: jest.fn() }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockUseCan(key),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("date-fns", () => ({
  format: () => "Sep 22, 2026 at 12:00 PM",
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/lib/utils", () => ({
  resolveImageUrl: (url: string) => url,
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));

jest.mock("@/lib/api-client", () => ({
  isApiError: () => false,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("@/components/shared", () => ({
  ErrorState: ({ description }: { description: string }) => (
    <div data-testid="error-state">{description}</div>
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children, value }: { children: React.ReactNode; value?: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectValue: () => null,
}));

jest.mock("lucide-react", () => ({
  ExternalLink: () => <span />,
}));

jest.mock("@animateicons/react/lucide", () => ({
  ChevronDownIcon: () => null,
  ChevronRightIcon: () => null,
  Trash2Icon: () => null,
}));

const WIDGET_PROJECT_ID = 10;
const LINKED_TICKET_PROJECT_ID = 20;
const TICKET_ID = 99;

jest.mock("./feedbucket-ai-panel", () => ({
  FeedbucketAiPanel: ({
    linkedTicketId,
    projectId,
    onTicketCreated,
  }: {
    linkedTicketId: number | null;
    projectId: number | null | undefined;
    onTicketCreated: (id: number) => void;
  }) => (
    <div
      data-testid="ai-panel"
      data-linked-ticket-id={linkedTicketId === null ? "null" : String(linkedTicketId)}
      data-project-id={projectId === undefined ? "none" : String(projectId)}
    >
      <button
        data-testid="simulate-convert"
        onClick={() => onTicketCreated(TICKET_ID)}
      />
    </div>
  ),
}));

function makeSubmission(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    orgId: "org-1",
    widgetId: 5,
    type: "bug",
    status: "open",
    priority: null,
    message: "Something broke",
    pageUrl: null,
    screenshotUrl: null,
    screenshotKey: null,
    recordingUrl: null,
    metadata: null,
    consoleLogs: null,
    networkLogs: null,
    reporterName: null,
    reporterEmail: null,
    crmContactId: null,
    crmOrganizationId: null,
    accountValueSnapshot: null,
    assigneeMembershipId: null,
    linkedTicketId: null,
    aiType: null,
    aiConfidence: null,
    aiAnalysis: null,
    aiModel: null,
    aiProcessedAt: null,
    createdAt: "2026-09-22T00:00:00Z",
    updatedAt: "2026-09-22T00:00:00Z",
    deletedAt: null,
    widget: { id: 5, projectId: WIDGET_PROJECT_ID },
    linkedTicket: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUsePageState.mockReturnValue({ kind: "ready" });
  mockUseCan.mockReturnValue(false);
  mockUseUpdateFeedbucketSubmission.mockReturnValue({
    mutateAsync: jest.fn(),
    isPending: false,
  });
  mockUseDeleteFeedbucketSubmission.mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
  });
  mockUseDeleteFeedbucketSubmissionMedia.mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
  });
});

function renderDetail(submissionData: unknown) {
  mockUseFeedbucketSubmission.mockReturnValue({
    data: submissionData,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
  return render(
    <FeedbucketSubmissionDetail submissionId={1} backHref="/build/1/feedbucket" />,
  );
}

function aiPanelProjectId(): string {
  return screen.getByTestId("ai-panel").getAttribute("data-project-id") ?? "";
}

function aiPanelLinkedTicketId(): string {
  return screen.getByTestId("ai-panel").getAttribute("data-linked-ticket-id") ?? "";
}

describe("FeedbucketSubmissionDetail — linked ticket project resolution", () => {
  describe("routing case: linkedTicket.projectId differs from widget.projectId", () => {
    it("passes the linked ticket's projectId to FeedbucketAiPanel, not the widget's home project", () => {
      renderDetail(
        makeSubmission({
          linkedTicketId: TICKET_ID,
          linkedTicket: {
            id: TICKET_ID,
            orgId: "org-1",
            projectId: LINKED_TICKET_PROJECT_ID,
            title: "Bug ticket",
            type: "BUG",
            status: "open",
          },
        }),
      );

      expect(aiPanelProjectId()).toBe(String(LINKED_TICKET_PROJECT_ID));
    });

    it("does not pass widget.projectId when linkedTicket is present with a different project", () => {
      renderDetail(
        makeSubmission({
          linkedTicketId: TICKET_ID,
          linkedTicket: {
            id: TICKET_ID,
            orgId: "org-1",
            projectId: LINKED_TICKET_PROJECT_ID,
            title: "Bug ticket",
            type: "BUG",
            status: "open",
          },
        }),
      );

      expect(aiPanelProjectId()).not.toBe(String(WIDGET_PROJECT_ID));
    });
  });

  describe("fallback case: linkedTicket is null", () => {
    it("falls back to widget.projectId when linkedTicket is null, so pre-existing links without a ticket object still navigate correctly", () => {
      renderDetail(
        makeSubmission({
          linkedTicketId: TICKET_ID,
          linkedTicket: null,
        }),
      );

      expect(aiPanelLinkedTicketId()).toBe(String(TICKET_ID));
      expect(aiPanelProjectId()).toBe(String(WIDGET_PROJECT_ID));
    });

    it("does not crash when both linkedTicket and widget are null", () => {
      renderDetail(
        makeSubmission({
          linkedTicketId: null,
          linkedTicket: null,
          widget: null,
        }),
      );

      expect(screen.getByTestId("ai-panel")).toBeInTheDocument();
    });
  });

  describe("control case: both sources agree on the same project", () => {
    it("the href project is unchanged when linkedTicket.projectId equals widget.projectId", () => {
      renderDetail(
        makeSubmission({
          linkedTicketId: TICKET_ID,
          linkedTicket: {
            id: TICKET_ID,
            orgId: "org-1",
            projectId: WIDGET_PROJECT_ID,
            title: "Bug ticket",
            type: "BUG",
            status: "open",
          },
        }),
      );

      expect(aiPanelProjectId()).toBe(String(WIDGET_PROJECT_ID));
    });
  });

  describe("post-conversion window: convertedTicketId set before submission detail refetches", () => {
    it("passes undefined as projectId while linkedTicket is still null after conversion so no link points to the wrong project", async () => {
      const user = userEvent.setup();
      renderDetail(
        makeSubmission({
          linkedTicketId: null,
          linkedTicket: null,
        }),
      );

      expect(aiPanelProjectId()).toBe(String(WIDGET_PROJECT_ID));

      await act(async () => {
        await user.click(screen.getByTestId("simulate-convert"));
      });

      expect(aiPanelLinkedTicketId()).toBe(String(TICKET_ID));
      expect(aiPanelProjectId()).toBe("none");
    });

    it("the badge (linkedTicketId) is still shown in the window even without the link, so the user knows a ticket exists", async () => {
      const user = userEvent.setup();
      renderDetail(
        makeSubmission({
          linkedTicketId: null,
          linkedTicket: null,
        }),
      );

      await act(async () => {
        await user.click(screen.getByTestId("simulate-convert"));
      });

      expect(aiPanelLinkedTicketId()).toBe(String(TICKET_ID));
    });
  });
});

describe("FeedbucketSubmissionDetail — usePageState integration (FE-40/FE-41/FE-49)", () => {
  it("calls usePageState with feedbucket:submissions:view permission and passes error so 402 is classified correctly", () => {
    renderDetail(makeSubmission());
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({
        permission: "feedbucket:submissions:view",
        error: null,
      }),
    );
  });

  it("renders denied state when usePageState returns denied", () => {
    mockUsePageState.mockReturnValue({
      kind: "denied",
      permission: "feedbucket:submissions:view",
    });
    renderDetail(makeSubmission());
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  });

  it("passes feedbucket:submissions:view as the permission key in denied resolution so NoPermissionState knows what was denied", () => {
    mockUsePageState.mockReturnValue({
      kind: "denied",
      permission: "feedbucket:submissions:view",
    });
    renderDetail(makeSubmission());
    expect(screen.getByTestId("no-permission")).toHaveAttribute(
      "data-permission",
      "feedbucket:submissions:view",
    );
  });
});
