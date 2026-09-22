import { render, screen } from "@testing-library/react";
import type { AccessState } from "@/lib/rbac/gate";
import { ProjectWebhooksPage } from "./project-webhooks-page";

let mockAccessState: AccessState = "denied";

jest.mock("@/hooks/api/access", () => ({
  useCan: (_permission: string) => mockAccessState === "granted",
  useCanState: (_permission: string): AccessState => mockAccessState,
}));

jest.mock("@/hooks/api/build/webhooks", () => ({
  useWebhooks: () => ({ data: [], isLoading: false, isError: false, refetch: jest.fn() }),
  useCreateWebhook: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteWebhook: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useRegisterDirtyState: jest.fn(),
  useNavigationLeave: () => (action: () => void) => action(),
}));

jest.mock("@/features/build/settings/webhook-card", () => ({
  WebhookCard: () => <div data-testid="webhook-card" />,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmStaggerList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "",
}));

beforeEach(() => {
  mockAccessState = "denied";
});

describe("ProjectWebhooksPage — build:manage controls (BLD-X-FE-SETTINGS-001)", () => {
  it("hides the Add Webhook button when the viewer lacks build:manage — no gate existed before", () => {
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.queryByRole("button", { name: /add webhook/i })).not.toBeInTheDocument();
  });

  it("shows the Add Webhook button when the viewer holds build:manage", () => {
    mockAccessState = "granted";
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByRole("button", { name: /add webhook/i })).toBeInTheDocument();
  });

  it("hides the Add Webhook button while the access snapshot is in flight, because a mutation control that appears and then vanishes offers authority the caller may not hold", () => {
    mockAccessState = "loading";
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.queryByRole("button", { name: /add webhook/i })).not.toBeInTheDocument();
  });
});
