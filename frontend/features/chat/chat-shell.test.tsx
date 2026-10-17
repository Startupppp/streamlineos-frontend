import { getChatMobileBottomNavClassName } from "@/components/layout/mobile/chat-mobile-chrome-layout";
import {
  getChatConversationListPaneClassName,
  getChatMessagePaneClassName,
  getChatSidebarClassName,
} from "./chat-shell-layout";

const BREAKPOINTS: Record<string, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

const DISPLAY_UTILITIES = new Set([
  "flex",
  "block",
  "grid",
  "inline-flex",
  "hidden",
]);

interface DisplayRule {
  minWidth: number;
  visible: boolean;
}

function collectDisplayRules(className: string): DisplayRule[] {
  const rules: DisplayRule[] = [];
  for (const token of className.split(/\s+/).filter(Boolean)) {
    const [variant, utility] = token.includes(":")
      ? [token.slice(0, token.lastIndexOf(":")), token.slice(token.lastIndexOf(":") + 1)]
      : ["", token];
    if (!DISPLAY_UTILITIES.has(utility)) continue;
    if (variant === "") {
      rules.push({ minWidth: 0, visible: utility !== "hidden" });
      continue;
    }
    const minWidth = BREAKPOINTS[variant];
    if (minWidth === undefined)
      throw new Error(`unhandled responsive variant in "${token}"`);
    rules.push({ minWidth, visible: utility !== "hidden" });
  }
  return rules.sort((a, b) => a.minWidth - b.minWidth);
}

function isVisibleAt(className: string, width: number): boolean {
  const rules = collectDisplayRules(className);
  expect(rules.length).toBeGreaterThan(0);
  let visible = true;
  for (const rule of rules) if (width >= rule.minWidth) visible = rule.visible;
  return visible;
}

const WIDTHS = [320, 360, 375, 414, 480, 600, 639, 640, 700, 767, 768, 1024, 1280];

describe("getChatSidebarClassName", () => {
  it("hides desktop chat chrome below the lg breakpoint", () => {
    expect(getChatSidebarClassName(false)).toContain("hidden lg:flex");
  });

  it("keeps the collapsed rail desktop-only", () => {
    expect(getChatSidebarClassName(true)).toContain("lg:w-[3.5rem]");
    expect(getChatSidebarClassName(true)).not.toContain("w-14");
  });
});

describe("getChatConversationListPaneClassName", () => {
  it("fills the width when the mobile conversation list is the active view", () => {
    const className = getChatConversationListPaneClassName(false, true);
    expect(className).toContain("w-full");
    expect(className).toContain("lg:w-[340px]");
    expect(className).not.toContain("md:w-[300px]");
    expect(className.split(/\s+/)).not.toContain("hidden");
    expect(isVisibleAt(className, 360)).toBe(true);
  });

  it("hides below lg when a conversation is open, keeping only desktop widths", () => {
    const className = getChatConversationListPaneClassName(false, false);
    expect(className).toContain("hidden lg:flex");
    expect(className).toContain("lg:w-[340px]");
    expect(className).not.toContain("md:w-[300px]");
  });

  it("uses the collapsed rail width only where the desktop pane exists", () => {
    expect(getChatConversationListPaneClassName(true, false)).toContain(
      "lg:w-[3.5rem]",
    );
  });
});

describe("getChatMessagePaneClassName", () => {
  it("hides the empty message pane below lg while the conversation list is active", () => {
    const className = getChatMessagePaneClassName(true);
    expect(className).toContain("hidden lg:flex");
    expect(isVisibleAt(className, 768)).toBe(false);
    expect(isVisibleAt(className, 1024)).toBe(true);
  });

  it("shows the message pane at every width once a conversation is open", () => {
    const className = getChatMessagePaneClassName(false);
    for (const width of WIDTHS) expect(isVisibleAt(className, width)).toBe(true);
  });
});

describe("the display evaluator behind the reachability invariant", () => {
  it("reads a base utility overridden at a breakpoint", () => {
    expect(isVisibleAt("hidden lg:flex", 1023)).toBe(false);
    expect(isVisibleAt("hidden lg:flex", 1024)).toBe(true);
  });

  it("reads a breakpoint-only hide", () => {
    expect(isVisibleAt("md:hidden fixed", 767)).toBe(true);
    expect(isVisibleAt("md:hidden fixed", 768)).toBe(false);
  });

  it("BITE — at sm:hidden the evaluator reports the 640-767 band as having neither surface", () => {
    const band = WIDTHS.filter((width) => width >= 640 && width < 768);
    expect(band.length).toBeGreaterThan(0);
    for (const width of band) {
      expect(isVisibleAt("sm:hidden fixed inset-x-0 bottom-0", width)).toBe(false);
      expect(isVisibleAt("hidden lg:flex", width)).toBe(false);
    }
  });
});

describe("chat navigation reachability — the nav and the pane that hosts it cannot both be hidden", () => {
  const navClassName = getChatMobileBottomNavClassName();
  const panes: Array<[string, string]> = [
    ["conversation pane (/chat)", getChatConversationListPaneClassName(false, false)],
    ["sidebar (/chat/channels)", getChatSidebarClassName(false)],
  ];

  for (const [paneName, paneClassName] of panes) {
    it(`at least one of the chat nav and the ${paneName} renders at every width`, () => {
      const blind = WIDTHS.filter(
        (width) =>
          !isVisibleAt(navClassName, width) &&
          !isVisibleAt(paneClassName, width),
      );
      expect(blind).toEqual([]);
    });
  }
});
