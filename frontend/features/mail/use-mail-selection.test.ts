import { act, renderHook, waitFor } from "@testing-library/react";
import { useMailSelection } from "./use-mail-selection";
import type { MailAccount, MailMessageSummary } from "@/types/mail";

const replaceMock = jest.fn<void, [string, (Record<string, unknown> | undefined)?]>();
let mockSearchParams = new URLSearchParams();
const mailActionMutate = jest.fn();
let canManageMail = true;

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => mockSearchParams,
}));

const ACTIVE_ACCOUNT: MailAccount = {
  id: 7,
  provider: "gmail",
  accountEmail: "me@example.com",
  accountLabel: null,
  status: "active",
  isPrimary: true,
};

const REAUTH_ACCOUNT: MailAccount = {
  ...ACTIVE_ACCOUNT,
  status: "needs_reauth",
};

const UNREAD_MESSAGE: MailMessageSummary = {
  id: "msg-1",
  threadId: "thread-1",
  accountId: 7,
  provider: "gmail",
  from: { name: "Sender", email: "sender@example.com" },
  to: [],
  subject: "Hello",
  snippet: "snippet",
  date: "2026-01-01T00:00:00.000Z",
  isRead: false,
  isStarred: false,
  hasAttachments: false,
};

const READ_MESSAGE: MailMessageSummary = { ...UNREAD_MESSAGE, isRead: true };

function setup(
  accounts: MailAccount[] = [ACTIVE_ACCOUNT],
  accountsLoading = false,
) {
  return renderHook(() =>
    useMailSelection({
      accounts,
      accountsLoading,
      canManageMail,
      mailActionMutate,
    }),
  );
}

beforeEach(() => {
  mockSearchParams = new URLSearchParams();
  canManageMail = true;
  replaceMock.mockReset();
  mailActionMutate.mockReset();
});

describe("useMailSelection — initial state", () => {
  it("selectedMessage is null before any selection", () => {
    const { result } = setup();
    expect(result.current.selectedMessage).toBeNull();
  });

  it("deepLinkStatus is idle when no URL params are present", () => {
    const { result } = setup();
    expect(result.current.deepLinkStatus).toBe("idle");
  });

  it("activeMessage is null when no message is selected and no deep link", () => {
    const { result } = setup();
    expect(result.current.activeMessage).toBeNull();
  });
});

describe("useMailSelection — deep-link status", () => {
  it("deepLinkStatus is not_found when accountId is unknown", () => {
    mockSearchParams = new URLSearchParams("accountId=99&messageId=xyz");
    const { result } = setup([ACTIVE_ACCOUNT]);
    expect(result.current.deepLinkStatus).toBe("not_found");
  });

  it("deepLinkStatus is needs_reauth when the account needs reauth", () => {
    mockSearchParams = new URLSearchParams("accountId=7&messageId=xyz");
    const { result } = setup([REAUTH_ACCOUNT]);
    expect(result.current.deepLinkStatus).toBe("needs_reauth");
  });

  it("deepLinkStatus is idle for a valid owned account deep link", () => {
    mockSearchParams = new URLSearchParams("accountId=7&messageId=abc");
    const { result } = setup([ACTIVE_ACCOUNT]);
    expect(result.current.deepLinkStatus).toBe("idle");
  });

  it("deepLinkStatus is idle while accounts are loading", () => {
    mockSearchParams = new URLSearchParams("accountId=7&messageId=abc");
    const { result } = setup([ACTIVE_ACCOUNT], true);
    expect(result.current.deepLinkStatus).toBe("idle");
  });

  it("non-numeric accountId is rejected: deepLinkRequested becomes false, so status is idle", () => {
    mockSearchParams = new URLSearchParams("accountId=abc&messageId=xyz");
    const { result } = setup([ACTIVE_ACCOUNT]);
    expect(result.current.deepLinkStatus).toBe("idle");
    expect(result.current.activeMessage).toBeNull();
  });

  it("negative accountId is rejected: deepLinkRequested becomes false, status is idle", () => {
    mockSearchParams = new URLSearchParams("accountId=-1&messageId=xyz");
    const { result } = setup([ACTIVE_ACCOUNT]);
    expect(result.current.deepLinkStatus).toBe("idle");
    expect(result.current.activeMessage).toBeNull();
  });

  it("zero accountId is rejected: deepLinkRequested becomes false, status is idle", () => {
    mockSearchParams = new URLSearchParams("accountId=0&messageId=xyz");
    const { result } = setup([ACTIVE_ACCOUNT]);
    expect(result.current.deepLinkStatus).toBe("idle");
    expect(result.current.activeMessage).toBeNull();
  });
});

describe("useMailSelection — deep-linked activeMessage", () => {
  it("messageId deep link produces an activeMessage with the correct id and accountId", () => {
    mockSearchParams = new URLSearchParams("accountId=7&messageId=abc");
    const { result } = setup([ACTIVE_ACCOUNT]);
    expect(result.current.activeMessage).not.toBeNull();
    expect(result.current.activeMessage?.id).toBe("abc");
    expect(result.current.activeMessage?.accountId).toBe(7);
    expect(result.current.activeMessage?.threadId).toBeNull();
  });

  it("threadId deep link produces an activeMessage with threadId as the id", () => {
    mockSearchParams = new URLSearchParams("accountId=7&threadId=t-1");
    const { result } = setup([ACTIVE_ACCOUNT]);
    expect(result.current.activeMessage?.id).toBe("t-1");
    expect(result.current.activeMessage?.threadId).toBe("t-1");
  });

  it("threadId wins over messageId when both params are present", () => {
    mockSearchParams = new URLSearchParams("accountId=7&messageId=abc&threadId=t-1");
    const { result } = setup([ACTIVE_ACCOUNT]);
    expect(result.current.activeMessage?.id).toBe("t-1");
    expect(result.current.activeMessage?.threadId).toBe("t-1");
  });

  it("no activeMessage from deep link when the account needs reauth", () => {
    mockSearchParams = new URLSearchParams("accountId=7&messageId=abc");
    const { result } = setup([REAUTH_ACCOUNT]);
    expect(result.current.activeMessage).toBeNull();
  });
});

describe("useMailSelection — deep-link markRead", () => {
  it("fires markRead for a valid deep-linked message", async () => {
    mockSearchParams = new URLSearchParams("accountId=7&messageId=abc");
    setup([ACTIVE_ACCOUNT]);

    await waitFor(() => {
      expect(mailActionMutate).toHaveBeenCalledTimes(1);
    });
    const call = mailActionMutate.mock.calls[0][0];
    expect(call.messageId).toBe("abc");
    expect(call.body.accountId).toBe(7);
    expect(call.body.action).toBe("markRead");
  });

  it("does not fire markRead when the actor cannot manage mail", async () => {
    canManageMail = false;
    mockSearchParams = new URLSearchParams("accountId=7&messageId=abc");
    setup([ACTIVE_ACCOUNT]);

    await new Promise((r) => setTimeout(r, 10));
    expect(mailActionMutate).not.toHaveBeenCalled();
  });

  it("does not fire markRead when the account needs reauth", async () => {
    mockSearchParams = new URLSearchParams("accountId=7&messageId=abc");
    setup([REAUTH_ACCOUNT]);

    await new Promise((r) => setTimeout(r, 10));
    expect(mailActionMutate).not.toHaveBeenCalled();
  });
});

describe("useMailSelection — select", () => {
  it("BITE: select sets selectedMessage", () => {
    const { result } = setup();
    act(() => result.current.select(UNREAD_MESSAGE));
    expect(result.current.selectedMessage?.id).toBe("msg-1");
  });

  it("select optimistically marks the message as read", () => {
    const { result } = setup();
    act(() => result.current.select(UNREAD_MESSAGE));
    expect(result.current.selectedMessage?.isRead).toBe(true);
  });

  it("select issues markRead for an unread message", () => {
    const { result } = setup();
    act(() => result.current.select(UNREAD_MESSAGE));
    expect(mailActionMutate).toHaveBeenCalledTimes(1);
    const call = mailActionMutate.mock.calls[0][0];
    expect(call.messageId).toBe("msg-1");
    expect(call.body.action).toBe("markRead");
    expect(call.body.threadId).toBe("thread-1");
  });

  it("select does not issue markRead for an already-read message", () => {
    const { result } = setup();
    act(() => result.current.select(READ_MESSAGE));
    expect(mailActionMutate).not.toHaveBeenCalled();
  });

  it("select does not issue markRead when canManageMail is false", () => {
    canManageMail = false;
    const { result } = setup();
    act(() => result.current.select(UNREAD_MESSAGE));
    expect(mailActionMutate).not.toHaveBeenCalled();
  });

  it("select syncs accountId and threadId to the URL", () => {
    const { result } = setup();
    act(() => result.current.select(UNREAD_MESSAGE));
    expect(replaceMock).toHaveBeenCalledTimes(1);
    const url: string = replaceMock.mock.calls[0][0];
    expect(url).toContain("accountId=7");
    expect(url).toContain("threadId=thread-1");
    expect(url).not.toContain("messageId");
  });

  it("select uses messageId when there is no threadId", () => {
    const messageWithoutThread: MailMessageSummary = {
      ...UNREAD_MESSAGE,
      threadId: null,
    };
    const { result } = setup();
    act(() => result.current.select(messageWithoutThread));
    const url: string = replaceMock.mock.calls[0][0];
    expect(url).toContain("messageId=msg-1");
    expect(url).not.toContain("threadId");
  });

  it("rolls the message back to unread when the server rejects the action", () => {
    const { result } = setup();
    act(() => result.current.select(UNREAD_MESSAGE));
    expect(result.current.selectedMessage?.isRead).toBe(true);
    const options = mailActionMutate.mock.calls[0]?.[1];
    act(() => options?.onError());
    expect(result.current.selectedMessage?.isRead).toBe(false);
  });
});

describe("useMailSelection — clear", () => {
  it("clear sets selectedMessage to null", () => {
    const { result } = setup();
    act(() => result.current.select(READ_MESSAGE));
    act(() => result.current.clear());
    expect(result.current.selectedMessage).toBeNull();
  });

  it("clear removes messageId and threadId from the URL", () => {
    mockSearchParams = new URLSearchParams("accountId=7&threadId=t-1");
    const { result } = setup();
    replaceMock.mockReset();
    act(() => result.current.clear());
    expect(replaceMock).toHaveBeenCalledTimes(1);
    const url: string = replaceMock.mock.calls[0][0];
    expect(url).not.toContain("messageId");
    expect(url).not.toContain("threadId");
  });
});
