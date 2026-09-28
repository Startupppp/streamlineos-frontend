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

describe("WebhookCard — row selection for bulk actions (BLD-X-FE-SETTINGS-WH-040)", () => {
  it("renders a selection checkbox when the page passes onSelectedChange", () => {
    render(
      <WebhookCard
        webhook={BASE_WEBHOOK}
        projectId={3}
        onDelete={jest.fn()}
        canManage
        onSelectedChange={jest.fn()}
      />,
    );
    expect(
      screen.getByRole("checkbox", { name: `Select ${BASE_WEBHOOK.url}` }),
    ).toBeInTheDocument();
  });

  it("renders no selection checkbox when the page passes no onSelectedChange — paired so the positive cannot pass on an always-on control", () => {
    render(
      <WebhookCard webhook={BASE_WEBHOOK} projectId={3} onDelete={jest.fn()} canManage />,
    );
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("reports the row id and the new state when the checkbox is clicked", () => {
    const onSelectedChange = jest.fn();
    render(
      <WebhookCard
        webhook={BASE_WEBHOOK}
        projectId={3}
        onDelete={jest.fn()}
        canManage
        onSelectedChange={onSelectedChange}
      />,
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: `Select ${BASE_WEBHOOK.url}` }),
    );
    expect(onSelectedChange).toHaveBeenCalledWith(BASE_WEBHOOK.id, true);
  });

  it("reports deselection when an already selected row is clicked", () => {
    const onSelectedChange = jest.fn();
    render(
      <WebhookCard
        webhook={BASE_WEBHOOK}
        projectId={3}
        onDelete={jest.fn()}
        canManage
        selected
        onSelectedChange={onSelectedChange}
      />,
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: `Select ${BASE_WEBHOOK.url}` }),
    );
    expect(onSelectedChange).toHaveBeenCalledWith(BASE_WEBHOOK.id, false);
  });
});

describe("diffWebhookConflictFields — field-level server/current comparison (BLD-X-FE-SETTINGS-WH-041)", () => {
  it("reports the active flag with both sides when the server disagrees with the submitted value", async () => {
    const { diffWebhookConflictFields } = await import(
      "@/features/build/webhooks/webhook-conflict-dialog"
    );
    expect(diffWebhookConflictFields({ isActive: false }, BASE_WEBHOOK)).toEqual([
      { key: "isActive", label: "Active", serverValue: "Enabled", pendingValue: "Disabled" },
    ]);
  });

  it("reports url and events together when an edit collided on both", async () => {
    const { diffWebhookConflictFields } = await import(
      "@/features/build/webhooks/webhook-conflict-dialog"
    );
    const fields = diffWebhookConflictFields(
      { url: "https://new.example.com/hook", events: ["comment.created"] },
      BASE_WEBHOOK,
    );
    expect(fields.map((f) => f.key)).toEqual(["url", "events"]);
    expect(fields[0]).toEqual({
      key: "url",
      label: "Payload URL",
      serverValue: BASE_WEBHOOK.url,
      pendingValue: "https://new.example.com/hook",
    });
    expect(fields[1].serverValue).toBe("ticket.created, ticket.updated");
  });

  it("reports nothing for a field the server already agrees with, so the overlay never shows a false difference", async () => {
    const { diffWebhookConflictFields } = await import(
      "@/features/build/webhooks/webhook-conflict-dialog"
    );
    expect(
      diffWebhookConflictFields(
        { url: BASE_WEBHOOK.url, events: ["ticket.updated", "ticket.created"], isActive: true },
        BASE_WEBHOOK,
      ),
    ).toEqual([]);
  });
});

describe("WebhookCard — page-controlled delivery panel (BLD-X-FE-SETTINGS-WH-043)", () => {
  it("renders the delivery history when the page says the row is open, so Enter on the focused row can open it", () => {
    render(
      <WebhookCard
        webhook={BASE_WEBHOOK}
        projectId={3}
        onDelete={jest.fn()}
        canManage
        expanded
        onExpandedChange={jest.fn()}
      />,
    );
    expect(screen.getByText("Recent Deliveries")).toBeInTheDocument();
  });

  it("renders no delivery history when the page says the row is closed — paired with the open assertion above", () => {
    render(
      <WebhookCard
        webhook={BASE_WEBHOOK}
        projectId={3}
        onDelete={jest.fn()}
        canManage
        expanded={false}
        onExpandedChange={jest.fn()}
      />,
    );
    expect(screen.queryByText("Recent Deliveries")).not.toBeInTheDocument();
  });

  it("asks the page to close the row instead of holding its own state when the chevron is clicked", () => {
    const onExpandedChange = jest.fn();
    render(
      <WebhookCard
        webhook={BASE_WEBHOOK}
        projectId={3}
        onDelete={jest.fn()}
        canManage
        expanded
        onExpandedChange={onExpandedChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /hide deliveries/i }));
    expect(onExpandedChange).toHaveBeenCalledWith(BASE_WEBHOOK.id, false);
  });

  it("still opens on its own when no page owns the state, so the card keeps working uncontrolled", () => {
    render(
      <WebhookCard webhook={BASE_WEBHOOK} projectId={3} onDelete={jest.fn()} canManage />,
    );
    fireEvent.click(screen.getByRole("button", { name: /show deliveries/i }));
    expect(screen.getByText("Recent Deliveries")).toBeInTheDocument();
  });
});
