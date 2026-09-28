import { render, screen, act } from "@testing-library/react";
import {
  SAMPLE_WEBHOOK,
  mockUseBuildListKeyboard,
  st,
} from "./webhook-page-test-harness";
import { ProjectWebhooksPage } from "./project-webhooks-page";

describe("ProjectWebhooksPage — keyboard shortcut wiring (BLD-X-FE-SETTINGS-WH-030)", () => {
  it("wires useBuildListKeyboard with onCreate pointing to the Add Webhook action when the viewer can manage", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    const lastArgs = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(typeof lastArgs?.onCreate).toBe("function");
    expect(lastArgs?.itemCount).toBe(1);
  });

  it("does not wire onCreate when the viewer cannot manage — the c shortcut must fail closed", () => {
    st.accessState = "denied";
    render(<ProjectWebhooksPage projectId="1" />);
    const lastArgs = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(lastArgs?.onCreate).toBeUndefined();
  });

  it("enables keyboard shortcuts only when the page is in the ready state", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    const lastArgs = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(lastArgs?.enabled).toBe(true);
  });

  it("disables keyboard shortcuts while loading", () => {
    st.accessState = "granted";
    st.isLoading = true;
    render(<ProjectWebhooksPage projectId="1" />);
    const lastArgs = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(lastArgs?.enabled).toBe(false);
  });
});

describe("ProjectWebhooksPage — shortcut help dialog (BLD-X-FE-SETTINGS-WH-031)", () => {
  it("passes onShortcutHelp to useBuildListKeyboard so the ? key can open the help overlay", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ onShortcutHelp: expect.any(Function) }),
    );
  });

  it("ShortcutHelpDialog is not shown on initial render — paired with the open test below", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.queryByTestId("shortcut-help-dialog")).not.toBeInTheDocument();
  });

  it("the onShortcutHelp callback passed to the keyboard hook opens the dialog — calling it does not throw and transitions open state", async () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    const onShortcutHelp = mockUseBuildListKeyboard.mock.calls[0]?.[0]?.onShortcutHelp;
    expect(typeof onShortcutHelp).toBe("function");
    await act(async () => { onShortcutHelp?.(); });
    expect(screen.getByTestId("shortcut-help-dialog")).toBeInTheDocument();
  });
});

describe("ProjectWebhooksPage — offline state (BLD-X-FE-SETTINGS-WH-032)", () => {
  it("hides the Add Webhook button when the user is offline — creation requires the server", () => {
    st.accessState = "granted";
    (
      jest.requireMock("@/hooks/common/use-online-status") as {
        useOnlineStatus: jest.Mock;
      }
    ).useOnlineStatus.mockReturnValue(false);
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.queryByRole("button", { name: /add webhook/i })).not.toBeInTheDocument();
  });

  it("shows the Add Webhook button when online — paired with the offline assertion above so it cannot pass on a blank frame", () => {
    st.accessState = "granted";
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByRole("button", { name: /add webhook/i })).toBeInTheDocument();
  });

  it("shows You are offline in the empty state when the device is offline", () => {
    st.accessState = "granted";
    st.webhooks = [];
    (
      jest.requireMock("@/hooks/common/use-online-status") as {
        useOnlineStatus: jest.Mock;
      }
    ).useOnlineStatus.mockReturnValue(false);
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByText("You are offline")).toBeInTheDocument();
  });

  it("does not show You are offline when the device is online and there are no webhooks", () => {
    st.accessState = "granted";
    st.webhooks = [];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.queryByText("You are offline")).not.toBeInTheDocument();
    expect(screen.getByText("No webhooks configured")).toBeInTheDocument();
  });
});

describe("ProjectWebhooksPage — j/k focus, Enter and / (BLD-X-FE-SETTINGS-WH-042)", () => {
  it("hands the search input to the keyboard hook, so / focuses a real element rather than nothing", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    const lastArgs = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(lastArgs?.searchInputRef?.current).toBe(
      screen.getByRole("textbox", { name: /search webhooks/i }),
    );
  });

  it("marks the j/k focused row as focused, so the moving cursor is visible on the list", () => {
    st.accessState = "granted";
    st.webhooks = [
      SAMPLE_WEBHOOK,
      { ...SAMPLE_WEBHOOK, id: 2, url: "https://b.example.com" },
    ];
    st.focusedIndex = 1;
    render(<ProjectWebhooksPage projectId="1" />);
    const cards = screen.getAllByTestId("webhook-card");
    expect(cards[0]).toHaveAttribute("data-focused", "false");
    expect(cards[1]).toHaveAttribute("data-focused", "true");
  });

  it("marks no row focused when the cursor has not moved — paired with the focused assertion above", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByTestId("webhook-card")).toHaveAttribute("data-focused", "false");
  });

  it("Enter on the focused row opens its delivery history, so the shortcut has a real target", async () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByTestId("webhook-card")).toHaveAttribute("data-expanded", "false");
    const onOpen = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0]?.onOpen;
    await act(async () => {
      onOpen?.(0);
    });
    expect(screen.getByTestId("webhook-card")).toHaveAttribute("data-expanded", "true");
  });

  it("Enter on an already open row closes it again, so the shortcut is reversible", async () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    const onOpen = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0]?.onOpen;
    await act(async () => {
      onOpen?.(0);
    });
    await act(async () => {
      onOpen?.(0);
    });
    expect(screen.getByTestId("webhook-card")).toHaveAttribute("data-expanded", "false");
  });

  it("Enter with an out-of-range focus opens nothing, so a stale cursor cannot expand the wrong row", async () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    const onOpen = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0]?.onOpen;
    await act(async () => {
      onOpen?.(9);
    });
    expect(screen.getByTestId("webhook-card")).toHaveAttribute("data-expanded", "false");
  });

  it("only one row is open at a time, so the expanded panel follows the cursor", async () => {
    st.accessState = "granted";
    st.webhooks = [
      SAMPLE_WEBHOOK,
      { ...SAMPLE_WEBHOOK, id: 2, url: "https://b.example.com" },
    ];
    render(<ProjectWebhooksPage projectId="1" />);
    const onOpen = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0]?.onOpen;
    await act(async () => {
      onOpen?.(0);
    });
    await act(async () => {
      onOpen?.(1);
    });
    const cards = screen.getAllByTestId("webhook-card");
    expect(cards[0]).toHaveAttribute("data-expanded", "false");
    expect(cards[1]).toHaveAttribute("data-expanded", "true");
  });
});
