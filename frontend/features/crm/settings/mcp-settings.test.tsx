import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AgentToken } from "@/types/projects/agent-tokens";
import { CrmMcpSettings } from "./mcp-settings";

const mockAccess = jest.fn();
const mockCan = jest.fn();
const mockTokens = jest.fn();
const mockTools = jest.fn();
const mockRevoke = jest.fn();
const mockMcpAccess = jest.fn();
const mockSetMcpAccess = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => mockAccess(),
  useCan: (key: string) => mockCan(key),
}));
jest.mock("@/hooks/api/crm/mcp-agent-tokens", () => ({
  useCrmAgentTokens: () => mockTokens(),
  useCrmMcpTools: () => mockTools(),
  useRevokeCrmAgentToken: () => mockRevoke(),
  useCreateCrmAgentToken: () => ({ mutate: jest.fn(), isPending: false }),
  useCrmMcpAccess: () => mockMcpAccess(),
  useSetCrmMcpAccess: () => mockSetMcpAccess(),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/components/renderer/use-tenant-layout", () => ({
  useTenantLayout: <T,>(layout: T): T => layout,
}));

const token = (over: Partial<AgentToken> = {}): AgentToken => ({
  id: 7,
  name: "Reporting agent",
  tokenPrefix: "sk_agt_abc",
  scopes: ["crm:deals:read"],
  lastUsedAt: null,
  expiresAt: null,
  revokedAt: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  ...over,
});

describe("CrmMcpSettings", () => {
  const allow = (keys: string[]) => mockCan.mockImplementation((k: string) => keys.includes(k));

  const renderSettings = () =>
    render(
      <TooltipProvider>
        <CrmMcpSettings />
      </TooltipProvider>,
    );

  beforeEach(() => {
    mockAccess.mockReturnValue({ isPending: false });
    allow(["settings:api-tokens:read", "settings:api-tokens:write"]);
    mockTokens.mockReturnValue({ data: [token()], isLoading: false, isError: false, refetch: jest.fn() });
    mockTools.mockReturnValue({ data: { tools: [] }, isLoading: false, isError: false, refetch: jest.fn() });
    mockRevoke.mockReturnValue({ mutate: jest.fn(), isPending: false });
    mockMcpAccess.mockReturnValue({ data: { enabled: true }, isLoading: false });
    mockSetMcpAccess.mockReturnValue({ mutate: jest.fn(), isPending: false });
  });

  it("lists an issued token by its prefix, never the secret", () => {
    renderSettings();
    expect(screen.getByText(/sk_agt_abc/)).toBeInTheDocument();
  });

  it("asks before revoking rather than revoking on the click", async () => {
    const mutate = jest.fn();
    mockRevoke.mockReturnValue({ mutate, isPending: false });

    renderSettings();
    await userEvent.click(screen.getByRole("button", { name: /revoke/i }));

    expect(mutate).not.toHaveBeenCalled();
  });

  it("offers no revoke on a token that is already revoked", () => {
    mockTokens.mockReturnValue({
      data: [token({ revokedAt: "2026-08-02T00:00:00.000Z" })],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    renderSettings();
    expect(screen.queryByRole("button", { name: /revoke/i })).not.toBeInTheDocument();
  });

  it("offers no revoke on a token that has expired", () => {
    mockTokens.mockReturnValue({
      data: [token({ expiresAt: "2020-01-01T00:00:00.000Z" })],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    renderSettings();
    expect(screen.queryByRole("button", { name: /revoke/i })).not.toBeInTheDocument();
  });

  it("does not offer issuing to somebody who may only read the list", () => {
    allow(["settings:api-tokens:read"]);
    renderSettings();
    expect(screen.queryByRole("button", { name: /revoke/i })).not.toBeInTheDocument();
  });

  it("shows whether agents may reach the CRM at all", () => {
    renderSettings();
    expect(
      screen.getByText(/agents may use the crm tools their token allows/i),
    ).toBeInTheDocument();
  });

  it("says plainly that turning it off is not a revocation", () => {
    renderSettings();
    expect(screen.getByText(/does not revoke anything/i)).toBeInTheDocument();
  });

  it("reads off when nobody has turned it on", () => {
    mockMcpAccess.mockReturnValue({ data: { enabled: false }, isLoading: false });
    renderSettings();
    expect(screen.getByText(/agents cannot reach the crm/i)).toBeInTheDocument();
  });
});
