import { render, screen, fireEvent } from "@testing-library/react";
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
  lastDeliveryAt: null,
  lastDeliveryStatus: null,
  failureRate: null,
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

describe("WebhookCard — enable / disable toggle (BLD-X-FE-SETTINGS-WH-024)", () => {
  it("renders the toggle switch when canManage is true and onToggle is provided — active webhook shows switch", () => {
    render(
      <WebhookCard
        webhook={BASE_WEBHOOK}
        projectId={3}
        onDelete={jest.fn()}
        onToggle={jest.fn()}
        canManage
      />,
    );
    expect(
      screen.getByRole("switch", { name: /disable webhook/i }),
    ).toBeInTheDocument();
  });

  it("calls onToggle with false when the switch is unchecked — disabling a webhook sends the right payload", () => {
    const onToggle = jest.fn();
    render(
      <WebhookCard
        webhook={BASE_WEBHOOK}
        projectId={3}
        onDelete={jest.fn()}
        onToggle={onToggle}
        canManage
      />,
    );
    fireEvent.click(screen.getByRole("switch", { name: /disable webhook/i }));
    expect(onToggle).toHaveBeenCalledWith(7, false);
  });

  it("calls onToggle with true when the switch is checked on an inactive webhook — enabling sends the right payload", () => {
    const onToggle = jest.fn();
    render(
      <WebhookCard
        webhook={{ ...BASE_WEBHOOK, isActive: false }}
        projectId={3}
        onDelete={jest.fn()}
        onToggle={onToggle}
        canManage
      />,
    );
    fireEvent.click(screen.getByRole("switch", { name: /enable webhook/i }));
    expect(onToggle).toHaveBeenCalledWith(7, true);
  });

  it("hides the toggle switch when canManage is false — mutation control fails closed", () => {
    render(
      <WebhookCard
        webhook={BASE_WEBHOOK}
        projectId={3}
        onDelete={jest.fn()}
        onToggle={jest.fn()}
        canManage={false}
      />,
    );
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("hides the toggle switch when onToggle is not provided even if canManage is true — caller opts in", () => {
    render(
      <WebhookCard
        webhook={BASE_WEBHOOK}
        projectId={3}
        onDelete={jest.fn()}
        canManage
      />,
    );
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });
});

describe("WebhookCard — last delivery on card face (BLD-X-FE-SETTINGS-WH-025)", () => {
  it("shows the last delivery date when lastDeliveryAt is set — so the operator can see when the most recent event was sent", () => {
    render(
      <WebhookCard
        webhook={{ ...BASE_WEBHOOK, lastDeliveryAt: "2026-09-01T10:00:00.000Z", lastDeliveryStatus: "success" }}
        projectId={3}
        onDelete={jest.fn()}
        canManage
      />,
    );
    expect(screen.getByText(/sep/i)).toBeInTheDocument();
  });

  it("does not render a last-delivery indicator when lastDeliveryAt is null — new webhooks have no delivery yet", () => {
    const { container } = render(
      <WebhookCard
        webhook={{ ...BASE_WEBHOOK, lastDeliveryAt: null }}
        projectId={3}
        onDelete={jest.fn()}
        canManage
      />,
    );
    expect(container.querySelector(".mt-1.flex.items-center.gap-2")).not.toBeInTheDocument();
  });
});

describe("WebhookCard — failure rate on card face (BLD-X-FE-SETTINGS-WH-026)", () => {
  it("shows a failure rate percentage when failureRate is set and nonzero — paired with the absent test below", () => {
    render(
      <WebhookCard
        webhook={{ ...BASE_WEBHOOK, lastDeliveryAt: "2026-09-01T10:00:00.000Z", lastDeliveryStatus: "failed", failureRate: 0.5 }}
        projectId={3}
        onDelete={jest.fn()}
        canManage
      />,
    );
    expect(screen.getByText("50% failure")).toBeInTheDocument();
  });

  it("does not show a failure rate when failureRate is null — a webhook with no deliveries shows no rate", () => {
    render(
      <WebhookCard
        webhook={{ ...BASE_WEBHOOK, lastDeliveryAt: null, failureRate: null }}
        projectId={3}
        onDelete={jest.fn()}
        canManage
      />,
    );
    expect(screen.queryByText(/failure/i)).not.toBeInTheDocument();
  });
});
