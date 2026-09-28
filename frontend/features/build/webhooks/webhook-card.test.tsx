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

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div role="menu">{children}</div> : null,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
  }) => (
    <button role="menuitem" onClick={onSelect}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

const BASE_WEBHOOK: ProjectWebhook = {
  id: 7,
  orgId: "org-1",
  projectId: 3,
  url: "https://ci.example.com/hook",
  events: ["ticket.created", "ticket.updated"],
  isActive: true,
  hasSecret: true,
  secretSetAt: "2026-06-01T00:00:00.000Z",
  version: 9,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
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
    expect(onToggle).toHaveBeenCalledWith({ id: 7, version: 9 }, false);
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
    expect(onToggle).toHaveBeenCalledWith({ id: 7, version: 9 }, true);
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

describe("WebhookCard — secret age uses secretSetAt not createdAt (BLD-X-FE-SETTINGS-WH-027)", () => {
  const ROTATED_WEBHOOK: ProjectWebhook = {
    ...BASE_WEBHOOK,
    createdAt: "2025-01-01T00:00:00.000Z",
    secretSetAt: "2026-09-01T00:00:00.000Z",
  };

  it("shows the rotation date when hasSecret is true and secretSetAt differs from createdAt — so a rotated secret shows its rotation month", () => {
    render(
      <WebhookCard
        webhook={ROTATED_WEBHOOK}
        projectId={3}
        onDelete={jest.fn()}
        canManage
      />,
    );
    expect(screen.getByText(/sep.*2026|2026.*sep/i)).toBeInTheDocument();
  });

  it("does not show the original creation date when the secret was rotated after creation — the old date must be absent", () => {
    render(
      <WebhookCard
        webhook={ROTATED_WEBHOOK}
        projectId={3}
        onDelete={jest.fn()}
        canManage
      />,
    );
    expect(screen.queryByText(/jan.*2025|2025.*jan/i)).not.toBeInTheDocument();
  });

  it("falls back to createdAt when hasSecret is false — a webhook with no secret shows its creation date", () => {
    const noSecret: ProjectWebhook = {
      ...BASE_WEBHOOK,
      hasSecret: false,
      secretSetAt: null,
      createdAt: "2025-06-01T00:00:00.000Z",
    };
    render(
      <WebhookCard
        webhook={noSecret}
        projectId={3}
        onDelete={jest.fn()}
        canManage
      />,
    );
    expect(screen.getByText(/jun.*2025|2025.*jun/i)).toBeInTheDocument();
  });
});

describe("WebhookCard — right-click context menu (BLD-X-FE-SETTINGS-WH-028)", () => {
  it("right-clicking the card opens the context menu — the menu is reachable without keyboard navigation", () => {
    render(
      <WebhookCard
        webhook={BASE_WEBHOOK}
        projectId={3}
        onDelete={jest.fn()}
        canManage
      />,
    );
    fireEvent.contextMenu(screen.getByText("https://ci.example.com/hook"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("normal left-click on the card body does not open the context menu — existing click behaviour is preserved", () => {
    render(
      <WebhookCard
        webhook={BASE_WEBHOOK}
        projectId={3}
        onDelete={jest.fn()}
        canManage
      />,
    );
    fireEvent.click(screen.getByText("https://ci.example.com/hook"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("the context menu shows an Edit item when onEdit is provided and canManage is true", () => {
    render(
      <WebhookCard
        webhook={BASE_WEBHOOK}
        projectId={3}
        onDelete={jest.fn()}
        onEdit={jest.fn()}
        canManage
      />,
    );
    fireEvent.contextMenu(screen.getByText("https://ci.example.com/hook"));
    expect(screen.getByRole("menuitem", { name: /edit/i })).toBeInTheDocument();
  });

  it("clicking Edit in the context menu calls onEdit with the webhook — so the edit Sheet can be opened", () => {
    const onEdit = jest.fn();
    render(
      <WebhookCard
        webhook={BASE_WEBHOOK}
        projectId={3}
        onDelete={jest.fn()}
        onEdit={onEdit}
        canManage
      />,
    );
    fireEvent.contextMenu(screen.getByText("https://ci.example.com/hook"));
    fireEvent.click(screen.getByRole("menuitem", { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(BASE_WEBHOOK);
  });
});
