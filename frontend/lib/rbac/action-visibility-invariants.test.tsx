import type { ReactNode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { useCan } from "@/hooks/api/access";
import { EpicCard } from "@/features/build/epics/epic-card";
import { WebhooksPage } from "@/features/settings/webhooks/webhooks-page";
import {
  useWebhooks,
  useToggleWebhook,
  useDeleteWebhook,
  useRotateWebhookSecret,
} from "@/hooks/api/webhooks";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
}));

jest.mock("@animateicons/react/lucide", () => ({
  EllipsisIcon: () => null,
  ChevronDownIcon: () => null,
  ChevronRightIcon: () => null,
  PlusIcon: () => null,
  Link2Icon: () => null,
  SendIcon: () => null,
  CopyIcon: () => null,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({
    iconRef: { current: null },
    hoverHandlers: {},
  }),
}));

jest.mock("@/components/pm-chrome", () => ({
  PM_PANEL: "pm-panel",
  PM_PANEL_SOLID: "pm-panel-solid",
}));

jest.mock("@/features/build/epics/edit-epic-dialog", () => ({
  EditEpicDialog: () => null,
}));

jest.mock("@/features/build/epics/epic-story-row", () => ({
  EpicStoryRow: () => null,
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

jest.mock("next/navigation", () => ({
  usePathname: () => "/settings/webhooks",
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/webhooks", () => ({
  useWebhooks: jest.fn(),
  useToggleWebhook: jest.fn(),
  useDeleteWebhook: jest.fn(),
  useRotateWebhookSecret: jest.fn(),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    actions,
    children,
  }: {
    actions?: ReactNode;
    children: ReactNode;
  }) => (
    <div>
      <div data-testid="page-actions">{actions}</div>
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

jest.mock("@/features/settings/webhooks/webhook-card", () => ({
  WebhookCard: () => null,
  WebhookCardSkeleton: () => null,
}));

jest.mock("@/features/settings/webhooks/webhook-create-sheet", () => ({
  WebhookCreateSheet: () => null,
}));

jest.mock("@/features/settings/webhooks/webhook-delivery-log", () => ({
  WebhookDeliveryLogSheet: () => null,
}));

jest.mock("@/features/settings/webhooks/webhook-secret-reveal-dialog", () => ({
  WebhookSecretRevealDialog: () => null,
}));

const EPIC = {
  id: 1,
  title: "Auth System",
  status: "IN_PROGRESS",
  description: null,
  priority: "HIGH",
  points: null,
};

function noop(): void {
  return;
}

describe("EpicCard permission gates — build:tickets:*", () => {
  beforeEach(() => {
    (useCan as jest.Mock).mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function renderCard() {
    return render(
      <EpicCard
        epic={EPIC}
        stories={[]}
        projectId={42}
        projectKey="AUTH"
        unlinkedStories={[]}
        onDeleteEpic={noop}
        onLinkStory={noop}
        onCreateStory={noop}
      />,
    );
  }

  it("hides create-story input without build:tickets:create", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Expand epic" }));
    expect(
      screen.queryByLabelText("Add new story to Auth System"),
    ).not.toBeInTheDocument();
  });

  it("reveals create-story input with build:tickets:create", () => {
    (useCan as jest.Mock).mockImplementation(
      (key) => key === "build:tickets:create",
    );
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Expand epic" }));
    expect(
      screen.getByLabelText("Add new story to Auth System"),
    ).toBeInTheDocument();
  });

  it("hides the more-actions menu without build:tickets:update or build:tickets:delete", () => {
    renderCard();
    expect(
      screen.queryByRole("button", { name: "More actions" }),
    ).not.toBeInTheDocument();
  });

  it("reveals the more-actions menu with build:tickets:update", () => {
    (useCan as jest.Mock).mockImplementation(
      (key) => key === "build:tickets:update",
    );
    renderCard();
    expect(
      screen.getByRole("button", { name: "More actions" }),
    ).toBeInTheDocument();
  });

  it("reveals the more-actions menu with build:tickets:delete on an empty epic", () => {
    (useCan as jest.Mock).mockImplementation(
      (key) => key === "build:tickets:delete",
    );
    renderCard();
    expect(
      screen.getByRole("button", { name: "More actions" }),
    ).toBeInTheDocument();
  });
});

describe("WebhooksPage permission gate — settings:webhooks:manage", () => {
  beforeEach(() => {
    (useCan as jest.Mock).mockReturnValue(false);
    (useWebhooks as jest.Mock).mockReturnValue({
      data: { data: [], pagination: { total: 0, totalPages: 1 } },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    (useToggleWebhook as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });
    (useDeleteWebhook as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });
    (useRotateWebhookSecret as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("hides Add Webhook without settings:webhooks:manage", () => {
    render(<WebhooksPage />);
    expect(
      within(screen.getByTestId("page-actions")).queryByRole("button"),
    ).not.toBeInTheDocument();
  });

  it("reveals Add Webhook with settings:webhooks:manage", () => {
    (useCan as jest.Mock).mockReturnValue(true);
    render(<WebhooksPage />);
    expect(
      within(screen.getByTestId("page-actions")).getByRole("button", {
        name: "Add Webhook",
      }),
    ).toBeInTheDocument();
  });
});
