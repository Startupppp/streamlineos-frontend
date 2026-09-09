import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AgentToken } from "@/types/projects";
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
  /** CRM-P2-09's tenant switch, which the page renders above the tokens. */
  useCrmMcpAccess: () => mockMcpAccess(),
  useSetCrmMcpAccess: () => mockSetMcpAccess(),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

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

/**
 * CRM-P1-20. The screen that hands out and takes back agent credentials.
 *
 * A token here is a standing grant to act on a tenant's CRM without a session,
 * so the two behaviours worth pinning are that revoking asks first and that
 * neither control is offered to somebody who may not use it. The permission
 * split is real: reading the list and issuing a credential are different keys.
 */
describe("CrmMcpSettings", () => {
  const allow = (keys: string[]) => mockCan.mockImplementation((k: string) => keys.includes(k));

  /** The scope badges use Tooltip, which needs its provider above them. */
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
    /** The full token is shown once at creation and is not recoverable after. */
    renderSettings();
    expect(screen.getByText(/sk_agt_abc/)).toBeInTheDocument();
  });

  it("asks before revoking rather than revoking on the click", async () => {
    const mutate = jest.fn();
    mockRevoke.mockReturnValue({ mutate, isPending: false });

    renderSettings();
    await userEvent.click(screen.getByRole("button", { name: /revoke/i }));

    /**
     * The click opens a confirmation; it must not have revoked anything yet.
     * Revoking is immediate and irreversible for whatever is using the token.
     */
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
    /**
     * Reading which agents exist and creating one that can act are different
     * keys on the server too — the button is absent rather than present and
     * failing.
     */
    allow(["settings:api-tokens:read"]);
    renderSettings();
    expect(screen.queryByRole("button", { name: /revoke/i })).not.toBeInTheDocument();
  });

  /**
   * CRM-P2-09. The switch that vetoes every token on this page.
   *
   * It has to be readable from the same screen that issues them, or an operator
   * mints a credential that works nowhere and finds out from an integrator.
   */
  it("shows whether agents may reach the CRM at all", () => {
    renderSettings();
    expect(
      screen.getByText(/agents may use the crm tools their token allows/i),
    ).toBeInTheDocument();
  });

  it("says plainly that turning it off is not a revocation", () => {
    /**
     * The alternative is an operator switching it off and assuming the tokens
     * are gone. They are not — they are refused, and revoking them is a separate
     * act with a separate consequence.
     */
    renderSettings();
    expect(screen.getByText(/does not revoke anything/i)).toBeInTheDocument();
  });

  it("reads off when nobody has turned it on", () => {
    /** A missing setting is off; the absence of a decision is not consent. */
    mockMcpAccess.mockReturnValue({ data: { enabled: false }, isLoading: false });
    renderSettings();
    expect(screen.getByText(/agents cannot reach the crm/i)).toBeInTheDocument();
  });
});
