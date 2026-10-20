import { render, screen, fireEvent, act } from "@testing-library/react";
import { mockNav, resetChatHomeHarness } from "./chat-home-page-test-harness";
import nextConfig from "@/next.config";
import { ChatHomePage } from "./chat-home-page";

beforeEach(() => {
  resetChatHomeHarness();
});

describe("/chat/channels — preserved through a redirect to the unified channel search", () => {
  it("redirects temporarily to /chat?search=channels, which opens search on the Channels tab", async () => {
    const redirects = (await nextConfig.redirects?.()) ?? [];
    const entry = redirects.find((r) => r.source === "/chat/channels");
    expect(entry?.destination).toBe("/chat?search=channels");
    expect(entry && "permanent" in entry ? entry.permanent : undefined).toBe(false);
  });

  it("the redirect target is a state the page understands", async () => {
    mockNav.searchParams = new URLSearchParams("search=channels");
    render(<ChatHomePage />);
    await act(async () => {});
    expect(screen.getByTestId("sidebar-search-scope")).toHaveTextContent("channels");
  });
});

describe("ChatHomePage — Back never reopens a consumed action param", () => {
  let history: string[];

  function syncFromHistory() {
    const top = history[history.length - 1];
    mockNav.searchParams = new URLSearchParams(top.includes("?") ? top.split("?")[1] : "");
  }

  beforeEach(() => {
    history = [];
    mockNav.push.mockImplementation((href: string) => {
      history.push(href);
    });
    mockNav.replace.mockImplementation((href: string) => {
      history[history.length - 1] = href;
    });
  });

  it("mount ?dm=1, create the DM, press Back: the New DM dialog stays closed", async () => {
    history = ["/chat?dm=1"];
    syncFromHistory();
    const { rerender } = render(<ChatHomePage />);
    await act(async () => {});
    syncFromHistory();
    rerender(<ChatHomePage />);

    fireEvent.click(screen.getByTestId("select-ch-5"));
    syncFromHistory();
    rerender(<ChatHomePage />);
    expect(await screen.findByTestId("panel-channel")).toHaveTextContent("5");

    history.pop();
    syncFromHistory();
    rerender(<ChatHomePage />);
    expect(mockNav.searchParams.has("dm")).toBe(false);
    expect(screen.getByTestId("sidebar-create-dialog")).toHaveTextContent("none");
  });

  it("open search, pick a message result, press Back: search stays closed", async () => {
    history = ["/chat?channel=2&search=messages"];
    syncFromHistory();
    const { rerender } = render(<ChatHomePage />);
    await act(async () => {});
    expect(screen.getByTestId("sidebar-search-scope")).toHaveTextContent("messages");

    fireEvent.click(screen.getByTestId("open-message"));
    syncFromHistory();
    rerender(<ChatHomePage />);
    expect(screen.getByTestId("panel-message")).toHaveTextContent("99");
    expect(screen.getByTestId("sidebar-search-scope")).toHaveTextContent("none");

    history.pop();
    syncFromHistory();
    rerender(<ChatHomePage />);
    expect(await screen.findByTestId("panel-channel")).toHaveTextContent("2");
    expect(screen.getByTestId("sidebar-search-scope")).toHaveTextContent("none");
  });

  it("picking a channel from search on the conversation already open drops search without a new history entry", async () => {
    history = ["/chat?channel=5&search=channels"];
    syncFromHistory();
    render(<ChatHomePage />);
    await act(async () => {});
    fireEvent.click(screen.getByTestId("select-ch-5"));
    expect(mockNav.push).not.toHaveBeenCalled();
    expect(history).toEqual(["/chat?channel=5"]);
  });
});
