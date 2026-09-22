import { FeedbucketWidget } from "./ui";

jest.mock("./screenshot", () => ({ captureScreenshot: jest.fn().mockResolvedValue(null) }));
jest.mock("./console-capture", () => ({ getConsoleBuffer: jest.fn().mockReturnValue([]) }));
jest.mock("./network-capture", () => ({ getNetworkLogs: jest.fn().mockReturnValue([]) }));
jest.mock("./metadata", () => ({
  collectMetadata: jest.fn().mockReturnValue({}),
  getPageUrl: jest.fn().mockReturnValue("http://test"),
}));
jest.mock("./api", () => ({
  submitFeedback: jest.fn().mockResolvedValue({}),
  aiAssistFeedback: jest.fn().mockResolvedValue({}),
}));
jest.mock("./recorder", () => ({ ScreenRecorder: jest.fn() }));
jest.mock("./annotator", () => ({ Annotator: jest.fn() }));

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }),
  });
});

function getFocusableInPanel(panel: HTMLElement): HTMLElement[] {
  return Array.from(
    panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([type="hidden"]):not([disabled]), textarea:not([disabled])',
    ),
  ).filter((el) => {
    if (el.hidden) return false;
    let node: Element | null = el.parentElement;
    while (node !== null && node !== panel) {
      if ((node as HTMLElement).hidden) return false;
      node = node.parentElement;
    }
    return true;
  });
}

describe("feedbucket widget focus trap", () => {
  let host: HTMLDivElement;
  let shadow: ShadowRoot;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    new FeedbucketWidget(host, "http://api", "key", false);
    shadow = host.shadowRoot!;
  });

  afterEach(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    document.body.removeChild(host);
  });

  it("moves focus to close button (first focusable) on open — remove activateFocusTrap and this fails", () => {
    const commentBtn = shadow.querySelector<HTMLButtonElement>(
      '.launcher-btn[aria-label="Send feedback"]',
    );
    commentBtn!.click();

    const closeBtn = shadow.querySelector<HTMLButtonElement>(".close-btn");
    expect(shadow.activeElement).toBe(closeBtn);
  });

  it("restores focus to launcher button after Escape — remove deactivateFocusTrap and this fails", () => {
    const commentBtn = shadow.querySelector<HTMLButtonElement>(
      '.launcher-btn[aria-label="Send feedback"]',
    );
    commentBtn!.focus();
    commentBtn!.click();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(shadow.activeElement).toBe(commentBtn);
  });

  it("wraps Tab forward from last focusable to first — remove Tab handler and this fails", () => {
    const commentBtn = shadow.querySelector<HTMLButtonElement>(
      '.launcher-btn[aria-label="Send feedback"]',
    );
    commentBtn!.click();

    const panel = shadow.querySelector<HTMLDivElement>(".panel")!;
    const focusable = getFocusableInPanel(panel);
    const last = focusable[focusable.length - 1];
    const first = focusable[0];

    last.focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));

    expect(shadow.activeElement).toBe(first);
  });

  it("wraps Shift+Tab backward from first focusable to last — remove Tab handler and this fails", () => {
    const commentBtn = shadow.querySelector<HTMLButtonElement>(
      '.launcher-btn[aria-label="Send feedback"]',
    );
    commentBtn!.click();

    const panel = shadow.querySelector<HTMLDivElement>(".panel")!;
    const focusable = getFocusableInPanel(panel);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    first.focus();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }),
    );

    expect(shadow.activeElement).toBe(last);
  });
});
