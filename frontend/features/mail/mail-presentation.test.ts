import { act, renderHook } from "@testing-library/react";
import { useMailPresentation, MAIL_COMPOSE_FAB_CLASS, MAIL_LIST_BOTTOM_PADDING_CLASS } from "./mail-presentation";

jest.mock("@/hooks/common/use-mobile", () => ({
  useIsMobile: () => false,
  useIsBelowLg: () => false,
}));

function setup(startOnDetail = false, startWithCompose = false) {
  return renderHook(() => useMailPresentation(startOnDetail, startWithCompose));
}

describe("useMailPresentation — initial state", () => {
  it("starts on the list pane when there is no deep-link target", () => {
    const { result } = setup(false, false);
    expect(result.current.pane).toBe("list");
    expect(result.current.composeOpen).toBe(false);
  });

  it("starts on the detail pane when a deep-link target is present", () => {
    const { result } = setup(true, false);
    expect(result.current.pane).toBe("detail");
  });

  it("opens compose immediately when the compose URL param was present at mount", () => {
    const { result } = setup(false, true);
    expect(result.current.composeOpen).toBe(true);
  });

  it("defaults composeMode to compose type on initial load", () => {
    const { result } = setup(false, false);
    expect(result.current.composeMode.type).toBe("compose");
  });

  it("accounts sheet is closed and not dismissed at initial load", () => {
    const { result } = setup(false, false);
    expect(result.current.accountsSheetOpen).toBe(false);
    expect(result.current.accountsSheetDismissed).toBe(false);
  });

  it("summary sheet is closed at initial load", () => {
    const { result } = setup(false, false);
    expect(result.current.summarySheetOpen).toBe(false);
  });

  it("recent drawer is closed at initial load", () => {
    const { result } = setup(false, false);
    expect(result.current.recentDrawerOpen).toBe(false);
  });
});

describe("useMailPresentation — pane transitions", () => {
  it("BITE: SELECT_MESSAGE moves from list to detail", () => {
    const { result } = setup(false, false);
    act(() => result.current.selectMessage());
    expect(result.current.pane).toBe("detail");
  });

  it("BACK_TO_LIST returns from detail to list", () => {
    const { result } = setup(true, false);
    act(() => result.current.backToList());
    expect(result.current.pane).toBe("list");
  });

  it("OPEN_COMPOSE sets composeOpen true", () => {
    const { result } = setup(false, false);
    act(() => result.current.openCompose());
    expect(result.current.composeOpen).toBe(true);
  });

  it("CLOSE_COMPOSE sets composeOpen false", () => {
    const { result } = setup(false, true);
    act(() => result.current.closeCompose());
    expect(result.current.composeOpen).toBe(false);
  });

  it("OPEN_COMPOSE stores the provided mode", () => {
    const { result } = setup(false, false);
    act(() => result.current.openCompose({
      type: "reply",
      messageId: "m1",
      threadId: "t1",
      toEmail: "a@b.com",
      subject: "Re: hello",
      accountId: 1,
    }));
    expect(result.current.composeOpen).toBe(true);
    expect(result.current.composeMode.type).toBe("reply");
  });

  it("OPEN_COMPOSE with no argument defaults to compose type", () => {
    const { result } = setup(false, false);
    act(() => result.current.openCompose());
    expect(result.current.composeMode.type).toBe("compose");
  });
});

describe("useMailPresentation — pane class derivation", () => {
  it("list pane is visible and detail pane is hidden while on the list", () => {
    const { result } = setup(false, false);
    expect(result.current.listPaneClass).not.toContain("hidden lg:flex");
    expect(result.current.detailPaneClass).toContain("hidden lg:flex");
  });

  it("detail pane is visible and list pane is hidden while on the detail", () => {
    const { result } = setup(true, false);
    expect(result.current.detailPaneClass).not.toContain("hidden lg:flex");
    expect(result.current.listPaneClass).toContain("hidden lg:flex");
  });

  it("both pane classes include the lg breakpoint qualifier for the show rule", () => {
    const { result } = setup(false, false);
    expect(result.current.detailPaneClass).toContain("lg:flex");
    act(() => result.current.selectMessage());
    expect(result.current.listPaneClass).toContain("lg:flex");
  });
});

describe("useMailPresentation — accounts sheet", () => {
  it("BITE: openAccountsSheet opens the accounts sheet and clears dismissed", () => {
    const { result } = setup(false, false);
    act(() => result.current.openAccountsSheet());
    expect(result.current.accountsSheetOpen).toBe(true);
    expect(result.current.accountsSheetDismissed).toBe(false);
  });

  it("closeAccountsSheet closes the accounts sheet and marks it dismissed", () => {
    const { result } = setup(false, false);
    act(() => result.current.openAccountsSheet());
    act(() => result.current.closeAccountsSheet());
    expect(result.current.accountsSheetOpen).toBe(false);
    expect(result.current.accountsSheetDismissed).toBe(true);
  });

  it("re-opening after dismissal clears the dismissed flag", () => {
    const { result } = setup(false, false);
    act(() => result.current.openAccountsSheet());
    act(() => result.current.closeAccountsSheet());
    act(() => result.current.openAccountsSheet());
    expect(result.current.accountsSheetDismissed).toBe(false);
  });
});

describe("useMailPresentation — summary sheet", () => {
  it("BITE: openSummarySheet opens the summary sheet", () => {
    const { result } = setup(false, false);
    act(() => result.current.openSummarySheet());
    expect(result.current.summarySheetOpen).toBe(true);
  });

  it("closeSummarySheet closes the summary sheet", () => {
    const { result } = setup(false, false);
    act(() => result.current.openSummarySheet());
    act(() => result.current.closeSummarySheet());
    expect(result.current.summarySheetOpen).toBe(false);
  });
});

describe("useMailPresentation — recent drawer", () => {
  it("BITE: openRecentDrawer opens the recent drawer", () => {
    const { result } = setup(false, false);
    act(() => result.current.openRecentDrawer());
    expect(result.current.recentDrawerOpen).toBe(true);
  });

  it("closeRecentDrawer closes the recent drawer", () => {
    const { result } = setup(false, false);
    act(() => result.current.openRecentDrawer());
    act(() => result.current.closeRecentDrawer());
    expect(result.current.recentDrawerOpen).toBe(false);
  });
});

describe("exported class constants", () => {
  it("compose FAB class includes the safe-area offset above the bottom nav", () => {
    expect(MAIL_COMPOSE_FAB_CLASS).toContain("env(safe-area-inset-bottom)");
    expect(MAIL_COMPOSE_FAB_CLASS).toContain("bottom-[calc(4rem");
    expect(MAIL_COMPOSE_FAB_CLASS).toContain("md:hidden");
  });

  it("list bottom padding class uses the max-md prefix for mobile-only spacing", () => {
    expect(MAIL_LIST_BOTTOM_PADDING_CLASS).toContain("max-md:");
  });
});
