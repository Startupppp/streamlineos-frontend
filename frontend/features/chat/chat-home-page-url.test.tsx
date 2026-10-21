import { render, screen, fireEvent, act } from "@testing-library/react";
import { mockNav, mockPageState, lastUrl, resetChatHomeHarness } from "./chat-home-page-test-harness";
import { ChatHomePage } from "./chat-home-page";

beforeEach(() => {
  resetChatHomeHarness();
});

describe("ChatHomePage — the URL is the only source of the selected conversation", () => {
  it("mount with ?channel=<id> opens that conversation and does not rewrite the URL", async () => {
    mockNav.searchParams = new URLSearchParams("channel=5");
    render(<ChatHomePage />);
    await act(async () => {});
    expect(screen.getByTestId("panel-channel")).toHaveTextContent("5");
    expect(mockNav.replace).not.toHaveBeenCalled();
    expect(mockNav.push).not.toHaveBeenCalled();
  });

  it("selecting a conversation pushes history so Back returns to the previous one", async () => {
    mockNav.searchParams = new URLSearchParams("foo=bar");
    render(<ChatHomePage />);
    await act(async () => {});
    fireEvent.click(screen.getByTestId("select-ch-5"));
    expect(mockNav.replace).not.toHaveBeenCalled();
    expect(mockNav.push).toHaveBeenCalledWith(
      expect.stringContaining("channel=5"),
      expect.objectContaining({ scroll: false }),
    );
    const params = lastUrl(mockNav.push);
    expect(params.get("channel")).toBe("5");
    expect(params.get("foo")).toBe("bar");
  });

  it("follows browser back/forward: a new ?channel re-renders the panel with no local copy to go stale", async () => {
    mockNav.searchParams = new URLSearchParams("channel=5");
    const { rerender } = render(<ChatHomePage />);
    await act(async () => {});
    expect(screen.getByTestId("panel-channel")).toHaveTextContent("5");

    mockNav.searchParams = new URLSearchParams("channel=8");
    rerender(<ChatHomePage />);
    expect(screen.getByTestId("panel-channel")).toHaveTextContent("8");

    mockNav.searchParams = new URLSearchParams();
    rerender(<ChatHomePage />);
    expect(screen.queryByTestId("message-panel")).toBeNull();
    expect(screen.getByTestId("empty-chat")).toBeInTheDocument();
  });

  it("switching conversation drops ?message in the same URL write, so the old anchor never applies to the new channel", async () => {
    mockNav.searchParams = new URLSearchParams("channel=5&message=99&inbox=unread");
    render(<ChatHomePage />);
    await act(async () => {});
    fireEvent.click(screen.getByTestId("select-ch-6"));
    expect(mockNav.push).toHaveBeenCalledTimes(1);
    const params = lastUrl(mockNav.push);
    expect(params.get("channel")).toBe("6");
    expect(params.has("message")).toBe(false);
    expect(params.get("inbox")).toBe("unread");
  });

  it("passes ?message to the panel only alongside its channel", async () => {
    mockNav.searchParams = new URLSearchParams("channel=5&message=99");
    const { rerender } = render(<ChatHomePage />);
    await act(async () => {});
    expect(screen.getByTestId("panel-message")).toHaveTextContent("99");

    mockNav.searchParams = new URLSearchParams("message=99");
    rerender(<ChatHomePage />);
    expect(screen.queryByTestId("message-panel")).toBeNull();
  });

  it("a message search result lands on the exact message: one push carries channel and message and closes search", async () => {
    mockNav.searchParams = new URLSearchParams("channel=5&search=messages");
    render(<ChatHomePage />);
    await act(async () => {});
    fireEvent.click(screen.getByTestId("open-message"));
    expect(mockNav.push).toHaveBeenCalledTimes(1);
    const params = lastUrl(mockNav.push);
    expect(params.get("channel")).toBe("7");
    expect(params.get("message")).toBe("99");
    expect(params.has("search")).toBe(false);
  });

  it("mobile Back clears the conversation from the URL so the list shows and browser Forward restores it", async () => {
    mockNav.searchParams = new URLSearchParams("channel=5&message=99&inbox=direct");
    render(<ChatHomePage />);
    await act(async () => {});
    fireEvent.click(screen.getByText("mobile back"));
    const params = lastUrl(mockNav.push);
    expect(params.has("channel")).toBe(false);
    expect(params.has("message")).toBe(false);
    expect(params.get("inbox")).toBe("direct");
  });

  it("drops ?message by replace when the panel leaves the anchored message (unavailable, jump to latest, send)", async () => {
    mockNav.searchParams = new URLSearchParams("channel=5&message=99");
    render(<ChatHomePage />);
    await act(async () => {});
    fireEvent.click(screen.getByText("leave message"));
    const params = lastUrl(mockNav.replace);
    expect(params.get("channel")).toBe("5");
    expect(params.has("message")).toBe(false);
    expect(mockNav.push).not.toHaveBeenCalled();
  });
});

describe("ChatHomePage — one owner for New DM / New channel / search", () => {
  it("never mounts a New DM or New channel dialog of its own", async () => {
    mockNav.searchParams = new URLSearchParams("dm=1");
    render(<ChatHomePage />);
    await act(async () => {});
    fireEvent.click(screen.getByText("empty new channel"));
    expect(screen.queryByTestId("page-new-dm-dialog")).toBeNull();
    expect(screen.queryByTestId("page-new-group-dialog")).toBeNull();
  });

  it("?dm=1 is consumed once on mount: the URL drops dm (keeping other params) while the sidebar's New DM dialog stays open", async () => {
    mockNav.searchParams = new URLSearchParams("dm=1&inbox=unread");
    const { rerender } = render(<ChatHomePage />);
    await act(async () => {});
    expect(screen.getByTestId("sidebar-create-dialog")).toHaveTextContent("dm");
    const params = lastUrl(mockNav.replace);
    expect(params.has("dm")).toBe(false);
    expect(params.get("inbox")).toBe("unread");
    expect(mockNav.push).not.toHaveBeenCalled();

    mockNav.searchParams = params;
    rerender(<ChatHomePage />);
    expect(screen.getByTestId("sidebar-create-dialog")).toHaveTextContent("dm");

    fireEvent.click(screen.getByTestId("close-create"));
    expect(screen.getByTestId("sidebar-create-dialog")).toHaveTextContent("none");
  });

  it("empty-state actions open the sidebar's dialogs", async () => {
    render(<ChatHomePage />);
    await act(async () => {});
    fireEvent.click(screen.getByText("empty new dm"));
    expect(screen.getByTestId("sidebar-create-dialog")).toHaveTextContent("dm");
    fireEvent.click(screen.getByText("empty new channel"));
    expect(screen.getByTestId("sidebar-create-dialog")).toHaveTextContent("channel");
    fireEvent.click(screen.getByText("empty search"));
    expect(lastUrl(mockNav.replace).get("search")).toBe("messages");
  });

  it("chat:open-new-dm and chat:open-new-channel route into the sidebar's dialog state", async () => {
    render(<ChatHomePage />);
    await act(async () => {});
    act(() => {
      window.dispatchEvent(new Event("chat:open-new-channel"));
    });
    expect(screen.getByTestId("sidebar-create-dialog")).toHaveTextContent("channel");
    act(() => {
      window.dispatchEvent(new Event("chat:open-new-dm"));
    });
    expect(screen.getByTestId("sidebar-create-dialog")).toHaveTextContent("dm");
  });

  it("chat:open-search opens the unified search through the URL, honouring a requested scope", async () => {
    render(<ChatHomePage />);
    await act(async () => {});
    act(() => {
      window.dispatchEvent(new CustomEvent("chat:open-search", { detail: "channels" }));
    });
    expect(lastUrl(mockNav.replace).get("search")).toBe("channels");
  });

  it("?search=<scope> is the search dialog's state; scope changes and close replace history", async () => {
    mockNav.searchParams = new URLSearchParams("search=channels&channel=5");
    render(<ChatHomePage />);
    await act(async () => {});
    expect(screen.getByTestId("sidebar-search-scope")).toHaveTextContent("channels");

    fireEvent.click(screen.getByTestId("scope-people"));
    expect(lastUrl(mockNav.replace).get("search")).toBe("people");

    fireEvent.click(screen.getByTestId("close-search"));
    const params = lastUrl(mockNav.replace);
    expect(params.has("search")).toBe(false);
    expect(params.get("channel")).toBe("5");
    expect(mockNav.push).not.toHaveBeenCalled();
  });
});

describe("ChatHomePage — gated through PageState", () => {
  it("renders the layout skeleton while the conversation list is loading", async () => {
    mockPageState.current = { kind: "loading" };
    render(<ChatHomePage />);
    await act(async () => {});
    expect(screen.getByRole("status", { name: "Loading chat" })).toBeInTheDocument();
    expect(screen.queryByTestId("empty-chat")).toBeNull();
  });

  it("the loading skeleton follows the URL: with ?channel the mobile view shows the conversation, not the list", async () => {
    mockPageState.current = { kind: "loading" };
    mockNav.searchParams = new URLSearchParams("channel=5");
    const { container } = render(<ChatHomePage />);
    await act(async () => {});
    const panes = container.querySelectorAll('[aria-busy="true"] > div');
    expect(panes[0].className).toContain("hidden lg:flex");
    expect(panes[1].className.split(" ")).not.toContain("hidden");
  });

  it("the loading skeleton honours the collapsed-sidebar cookie so the pane does not jump", async () => {
    mockPageState.current = { kind: "loading" };
    document.cookie = "chat-sidebar-collapsed=true; path=/";
    const { container } = render(<ChatHomePage />);
    await act(async () => {});
    document.cookie = "chat-sidebar-collapsed=false; path=/";
    const panes = container.querySelectorAll('[aria-busy="true"] > div');
    expect(panes[0].className).toContain("lg:w-[3.5rem]");
  });

  it("renders the denied surface instead of an empty inbox", async () => {
    mockPageState.current = { kind: "denied" };
    render(<ChatHomePage />);
    await act(async () => {});
    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-chat")).toBeNull();
  });

  it("?joinHuddle=1 reaches the panel and is consumed by one replace that keeps the other params", async () => {
    mockNav.searchParams = new URLSearchParams("channel=5&joinHuddle=1&inbox=unread");
    render(<ChatHomePage />);
    await act(async () => {});
    expect(screen.getByTestId("panel-join-huddle")).toHaveTextContent("true");
    expect(mockNav.replace).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("handle join huddle"));
    expect(mockNav.replace).toHaveBeenCalledTimes(1);
    expect(mockNav.push).not.toHaveBeenCalled();
    const params = lastUrl(mockNav.replace);
    expect(params.has("joinHuddle")).toBe(false);
    expect(params.get("channel")).toBe("5");
    expect(params.get("inbox")).toBe("unread");
  });

  it("without ?joinHuddle the panel is not asked to join", async () => {
    mockNav.searchParams = new URLSearchParams("channel=5");
    render(<ChatHomePage />);
    await act(async () => {});
    expect(screen.getByTestId("panel-join-huddle")).toHaveTextContent("false");
  });
});
