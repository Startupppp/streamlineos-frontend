import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateTokenDialog } from "./agent-token-create-dialog";
import type { CreateAgentTokenResponse } from "@/hooks/api/build/agent-tokens";

/**
 * Deliberately fake, worthless token — not a real credential, never sent to any
 * service. The slos_ prefix is the production prefix so tests exercise the real
 * validation path.
 */
const FAKE_TOKEN = "slos_" + "0".repeat(48);

const FAKE_CREATE_RESPONSE: CreateAgentTokenResponse = {
  token: FAKE_TOKEN,
  id: 99,
  name: "test-dialog-token",
  tokenPrefix: "slos_0000",
  scopes: ["build:view"],
  expiresAt: null,
  createdAt: "2024-01-01T00:00:00.000Z",
};

const mockMutate = jest.fn();

jest.mock("@/hooks/api/build/agent-tokens", () => ({
  useCreateAgentToken: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

const mockClipboard = { writeText: jest.fn().mockResolvedValue(undefined) };

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

beforeEach(() => {
  mockMutate.mockClear();
  Object.defineProperty(navigator, "clipboard", {
    value: mockClipboard,
    configurable: true,
  });
  mockClipboard.writeText.mockClear();
});

describe("CreateTokenDialog — form phase (BLD-X-FE-SETTINGS-DIALOG-001)", () => {
  it("renders name input and expiry select in form phase", () => {
    render(<CreateTokenDialog open onOpenChange={jest.fn()} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("raw token value is not visible in form phase — no premature credential exposure", () => {
    render(<CreateTokenDialog open onOpenChange={jest.fn()} />);
    expect(screen.queryByText(FAKE_TOKEN)).not.toBeInTheDocument();
  });

  it("submit button calls mutate with name and expiry — positive creation path", async () => {
    mockMutate.mockImplementation(
      (_data: unknown, callbacks: { onSuccess: (d: CreateAgentTokenResponse) => void }) => {
        callbacks.onSuccess(FAKE_CREATE_RESPONSE);
      },
    );
    render(<CreateTokenDialog open onOpenChange={jest.fn()} />);
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "my ci token" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create token/i }));
    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "my ci token" }),
      expect.anything(),
    );
  });
});

describe("CreateTokenDialog — reveal phase / show-once (BLD-X-FE-SETTINGS-DIALOG-002)", () => {
  async function openRevealPhase() {
    mockMutate.mockImplementation(
      (_data: unknown, callbacks: { onSuccess: (d: CreateAgentTokenResponse) => void }) => {
        callbacks.onSuccess(FAKE_CREATE_RESPONSE);
      },
    );
    render(<CreateTokenDialog open onOpenChange={jest.fn()} />);
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "reveal phase token" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create token/i }));
    await waitFor(() => screen.getByText(FAKE_TOKEN));
  }

  it("token value is visible in the reveal phase after creation — positive show-once check", async () => {
    await openRevealPhase();
    expect(screen.getByText(FAKE_TOKEN)).toBeInTheDocument();
  });

  it("copy button aria-label does not contain the raw token value — no credential in accessible label", async () => {
    await openRevealPhase();
    const copyButtons = screen.getAllByRole("button", { name: /copy token/i });
    for (const btn of copyButtons) {
      expect(btn.getAttribute("aria-label") ?? "").not.toContain(FAKE_TOKEN);
    }
  });

  it("no title attribute on any element contains the raw token value — no tooltip exposure", async () => {
    await openRevealPhase();
    const allElements = document.querySelectorAll("[title]");
    allElements.forEach((el) => {
      expect(el.getAttribute("title") ?? "").not.toContain(FAKE_TOKEN);
    });
  });

  it("warning text tells user the token will not be shown again", async () => {
    await openRevealPhase();
    expect(screen.getByText(/will not be shown again/i)).toBeInTheDocument();
  });

  it("copy button writes the token to clipboard — not a toast with the value", async () => {
    await openRevealPhase();
    const copyButtons = screen.getAllByRole("button", { name: /copy token/i });
    fireEvent.click(copyButtons[0]);
    await waitFor(() => expect(mockClipboard.writeText).toHaveBeenCalledWith(FAKE_TOKEN));
  });
});

describe("CreateTokenDialog — token cleared on close (BLD-X-FE-SETTINGS-DIALOG-003)", () => {
  it("token value is absent from form phase — token not leaked when dialog re-opens in form phase", async () => {
    mockMutate.mockImplementation(
      (_data: unknown, callbacks: { onSuccess: (d: CreateAgentTokenResponse) => void }) => {
        callbacks.onSuccess(FAKE_CREATE_RESPONSE);
      },
    );
    const onOpenChange = jest.fn();
    render(<CreateTokenDialog open onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "ephemeral" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create token/i }));
    await waitFor(() => screen.getByText(FAKE_TOKEN));

    fireEvent.click(screen.getByRole("button", { name: /^done$/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Cancel button in form phase closes the dialog without calling mutate", () => {
    const onOpenChange = jest.fn();
    render(<CreateTokenDialog open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
