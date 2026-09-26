import { render, screen } from "@testing-library/react";
import type { AccessState } from "@/lib/rbac/gate";
import { WebhookCard } from "@/features/build/settings/webhook-card";
import type { ProjectWebhook } from "@/hooks/api/build/webhooks";

let mockAccessState: AccessState = "granted";

jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockAccessState === "granted",
  useCanState: (): AccessState => mockAccessState,
}));

jest.mock("@/hooks/api/build/webhooks", () => ({
  useWebhookDeliveries: () => ({ data: [], isLoading: false }),
  useSendTestWebhook: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/components/pm-chrome", () => ({
  PM_PANEL: "",
}));

const BASE_WEBHOOK: ProjectWebhook = {
  id: 7,
  projectId: 3,
  url: "https://ci.example.com/hook",
  events: ["ticket.created", "ticket.updated"],
  isActive: true,
  createdAt: "2026-06-01T00:00:00.000Z",
};

beforeEach(() => {
  mockAccessState = "granted";
});

describe("WebhookCard — enabled / disabled field (BLD-X-FE-SETTINGS-WH-020)", () => {
  it("shows 'Enabled' badge when isActive is true", () => {
    render(
      <WebhookCard
        webhook={BASE_WEBHOOK}
        projectId={3}
        onDelete={jest.fn()}
        canManage
      />,
    );
    expect(screen.getByText("Enabled")).toBeInTheDocument();
  });

  it("shows 'Disabled' badge when isActive is false — a paused webhook is distinguished from an active one", () => {
    render(
      <WebhookCard
        webhook={{ ...BASE_WEBHOOK, isActive: false }}
        projectId={3}
        onDelete={jest.fn()}
        canManage
      />,
    );
    expect(screen.getByText("Disabled")).toBeInTheDocument();
    expect(screen.queryByText("Enabled")).not.toBeInTheDocument();
  });
});

describe("WebhookCard — URL field (BLD-X-FE-SETTINGS-WH-021)", () => {
  it("displays the webhook endpoint URL", () => {
    render(
      <WebhookCard
        webhook={BASE_WEBHOOK}
        projectId={3}
        onDelete={jest.fn()}
        canManage
      />,
    );
    expect(screen.getByText("https://ci.example.com/hook")).toBeInTheDocument();
  });
});

describe("WebhookCard — secret age (BLD-X-FE-SETTINGS-WH-022)", () => {
  it("shows the creation month/year so the operator can judge secret age", () => {
    render(
      <WebhookCard
        webhook={BASE_WEBHOOK}
        projectId={3}
        onDelete={jest.fn()}
        canManage
      />,
    );
    expect(screen.getByText(/since/i)).toBeInTheDocument();
  });
});

describe("WebhookCard — mutation controls (BLD-X-FE-SETTINGS-WH-023)", () => {
  it("shows send test and delete buttons when canManage is true", () => {
    render(
      <WebhookCard
        webhook={BASE_WEBHOOK}
        projectId={3}
        onDelete={jest.fn()}
        canManage
      />,
    );
    expect(
      screen.getByRole("button", { name: /send test webhook/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /delete webhook/i }),
    ).toBeInTheDocument();
  });

  it("hides the delete button when canManage is false — the action is write-protected", () => {
    render(
      <WebhookCard
        webhook={BASE_WEBHOOK}
        projectId={3}
        onDelete={jest.fn()}
        canManage={false}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /delete webhook/i }),
    ).not.toBeInTheDocument();
  });
});
