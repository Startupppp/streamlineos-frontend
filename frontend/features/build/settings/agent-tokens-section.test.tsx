import { render, screen, fireEvent, within } from "@testing-library/react";
import { AgentTokensSection } from "./agent-tokens-section";
import type { AgentToken } from "@/hooks/api/build/agent-tokens";

const ACTIVE_TOKEN: AgentToken = {
  id: 1,
  name: "My test token",
  tokenPrefix: "slos_00",
  scopes: ["build:view"],
  lastUsedAt: null,
  expiresAt: null,
  revokedAt: null,
  createdAt: "2024-01-01T00:00:00.000Z",
};

const REVOKED_TOKEN: AgentToken = {
  id: 2,
  name: "Old revoked token",
  tokenPrefix: "slos_11",
  scopes: [],
  lastUsedAt: null,
  expiresAt: null,
  revokedAt: "2024-06-01T00:00:00.000Z",
  createdAt: "2024-01-01T00:00:00.000Z",
};

let mockData: AgentToken[] | undefined;
let mockIsLoading = false;
let mockIsError = false;
const mockRefetch = jest.fn();
const mockRevokeMutate = jest.fn();
let mockCanWriteTokens = true;

jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockCanWriteTokens,
  usePermissionGate: (permission: string) => ({
    permission,
    allowed: true,
    denied: false,
    pending: false,
    unavailable: false,
  }),
}));

jest.mock("@/hooks/api/build/agent-tokens", () => ({
  useAgentTokens: () => ({
    data: mockData,
    isLoading: mockIsLoading,
    isError: mockIsError,
    refetch: mockRefetch,
  }),
  useRevokeAgentToken: () => ({
    mutate: mockRevokeMutate,
    isPending: false,
  }),
}));

jest.mock("@/features/build/settings/agent-token-create-dialog", () => ({
  CreateTokenDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="create-token-dialog" /> : null,
}));

jest.mock("@/features/build/settings/agent-token-setup-help", () => ({
  SetupHelp: () => <div data-testid="setup-help" />,
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

beforeEach(() => {
  mockCanWriteTokens = true;
  mockData = undefined;
  mockIsLoading = false;
  mockIsError = false;
  mockRefetch.mockClear();
  mockRevokeMutate.mockClear();
});

describe("AgentTokensSection — states (BLD-X-FE-SETTINGS-AGENTS-S001)", () => {
  it("renders empty state when token list is empty — positive empty check", () => {
    mockData = [];
    render(<AgentTokensSection />);
    expect(screen.getByText("No tokens yet")).toBeInTheDocument();
  });

  it("does not render empty state when tokens exist — empty is not a false negative", () => {
    mockData = [ACTIVE_TOKEN];
    render(<AgentTokensSection />);
    expect(screen.queryByText("No tokens yet")).not.toBeInTheDocument();
  });

  it("renders token name when token list is populated — positive populated check", () => {
    mockData = [ACTIVE_TOKEN];
    render(<AgentTokensSection />);
    expect(screen.getByText("My test token")).toBeInTheDocument();
  });

  it("renders token prefix in code element — prefix shown, not raw token value", () => {
    mockData = [ACTIVE_TOKEN];
    render(<AgentTokensSection />);
    expect(screen.getByText(/slos_00/)).toBeInTheDocument();
  });

  it("does not render empty state while loading", () => {
    mockIsLoading = true;
    render(<AgentTokensSection />);
    expect(screen.queryByText("No tokens yet")).not.toBeInTheDocument();
  });

  it("renders error state title when load fails — positive error check", () => {
    mockIsError = true;
    render(<AgentTokensSection />);
    expect(screen.getByText(/could not load tokens/i)).toBeInTheDocument();
  });

  it("error state is not shown when tokens load successfully — error is not a false positive", () => {
    mockData = [];
    render(<AgentTokensSection />);
    expect(screen.queryByText(/could not load tokens/i)).not.toBeInTheDocument();
  });

  it("retry button in error state calls refetch", () => {
    mockIsError = true;
    render(<AgentTokensSection />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});

describe("AgentTokensSection — create action (BLD-X-FE-SETTINGS-AGENTS-S002)", () => {
  it("create dialog is closed by default — not open on mount", () => {
    mockData = [];
    render(<AgentTokensSection />);
    expect(screen.queryByTestId("create-token-dialog")).not.toBeInTheDocument();
  });

  it("New token button opens create dialog — positive paired with default-closed test", () => {
    mockData = [];
    render(<AgentTokensSection />);
    fireEvent.click(screen.getByRole("button", { name: /new token/i }));
    expect(screen.getByTestId("create-token-dialog")).toBeInTheDocument();
  });
});

describe("AgentTokensSection — revoke action (BLD-X-FE-SETTINGS-AGENTS-S003)", () => {
  it("active token shows Revoke button — revoke control is present for active tokens", () => {
    mockData = [ACTIVE_TOKEN];
    render(<AgentTokensSection />);
    expect(screen.getByRole("button", { name: /^revoke$/i })).toBeInTheDocument();
  });

  it("revoked token does not show Revoke button — no double-revoke path", () => {
    mockData = [REVOKED_TOKEN];
    render(<AgentTokensSection />);
    expect(screen.queryByRole("button", { name: /^revoke$/i })).not.toBeInTheDocument();
  });

  it("Revoke button opens confirm dialog before mutating — user must confirm", () => {
    mockData = [ACTIVE_TOKEN];
    render(<AgentTokensSection />);
    fireEvent.click(screen.getByRole("button", { name: /^revoke$/i }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(mockRevokeMutate).not.toHaveBeenCalled();
  });

  it("confirming revoke calls mutate with the correct token id — positive paired with cancel test", () => {
    mockData = [ACTIVE_TOKEN];
    render(<AgentTokensSection />);
    fireEvent.click(screen.getByRole("button", { name: /^revoke$/i }));
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^revoke$/i }));
    expect(mockRevokeMutate).toHaveBeenCalledWith(1, expect.anything());
  });

  it("cancelling revoke dialog does not call mutate — negative paired with confirm test", () => {
    mockData = [ACTIVE_TOKEN];
    render(<AgentTokensSection />);
    fireEvent.click(screen.getByRole("button", { name: /^revoke$/i }));
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));
    expect(mockRevokeMutate).not.toHaveBeenCalled();
  });
});

describe("AgentTokensSection — secret handling (BLD-X-FE-SETTINGS-AGENTS-S004)", () => {
  it("list renders token prefix, not a full token value — raw token not shown in list", () => {
    mockData = [ACTIVE_TOKEN];
    render(<AgentTokensSection />);
    const prefixEl = screen.getByText(/slos_00/);
    expect(prefixEl.tagName.toLowerCase()).toBe("code");
  });

  it("shows Active badge for a non-expired, non-revoked token", () => {
    mockData = [ACTIVE_TOKEN];
    render(<AgentTokensSection />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows Revoked badge for a revoked token", () => {
    mockData = [REVOKED_TOKEN];
    render(<AgentTokensSection />);
    expect(screen.getByText("Revoked")).toBeInTheDocument();
  });
});

describe("AgentTokensSection — token controls follow settings:api-tokens:write, not the page gate", () => {
  it("offers no New token control to a member who cannot write api tokens", () => {
    mockCanWriteTokens = false;
    mockData = [];
    render(<AgentTokensSection />);
    expect(screen.queryByRole("button", { name: /new token/i })).toBeNull();
  });

  it("offers the New token control when the member can write api tokens, so the denial above is the gate and not a render failure", () => {
    mockCanWriteTokens = true;
    mockData = [];
    render(<AgentTokensSection />);
    expect(screen.getByRole("button", { name: /new token/i })).toBeInTheDocument();
  });

  it("offers no Revoke control on an active token to a member who cannot write api tokens", () => {
    mockCanWriteTokens = false;
    mockData = [ACTIVE_TOKEN];
    render(<AgentTokensSection />);
    expect(screen.queryByRole("button", { name: /revoke/i })).toBeNull();
  });

  it("offers Revoke on an active token when the member can write api tokens", () => {
    mockCanWriteTokens = true;
    mockData = [ACTIVE_TOKEN];
    render(<AgentTokensSection />);
    expect(screen.getByRole("button", { name: /revoke/i })).toBeInTheDocument();
  });
});

describe("AgentTokensSection — cleartext token never appears in the list view (BLD-X-FE-SETTINGS-AGENTS-S005)", () => {
  const PLAUSIBLE_TOKEN_CHARS = /^slos_[A-Za-z0-9]{20,}/;

  it("rendered token item does not contain a plausible full-length token string — prefix only", () => {
    mockData = [ACTIVE_TOKEN];
    const { container } = render(<AgentTokensSection />);
    expect(container.textContent).not.toMatch(PLAUSIBLE_TOKEN_CHARS);
  });

  it("tokenPrefix shown in list is shorter than a real token — masked display confirmed", () => {
    mockData = [ACTIVE_TOKEN];
    render(<AgentTokensSection />);
    const prefixEl = screen.getByText(/slos_00/);
    const displayedText = prefixEl.textContent ?? "";
    expect(displayedText.length).toBeLessThan(20);
  });

  it("list view still renders correctly with no cleartext suppression needed — negative control passes when prefix is the only value available", () => {
    mockData = [{ ...ACTIVE_TOKEN, tokenPrefix: "slos_ff" }];
    render(<AgentTokensSection />);
    expect(screen.getByText(/slos_ff/)).toBeInTheDocument();
    expect(screen.queryByText(/slos_ff[A-Za-z0-9]{10,}/)).not.toBeInTheDocument();
  });
});
