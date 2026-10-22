import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SharedFilesPanel } from "./shared-files-panel";
import { SavedMessagesPanel } from "./saved-messages-panel";
import type { z } from "zod";
import type { chatChannelFilesContract } from "@/hooks/api/chat-schema/file-schema";
import type { SavedMessage } from "@/types/chat";

const PANEL_RENDER_PAGE_SIZE = 25;
type ChannelFile = z.infer<typeof chatChannelFilesContract>["files"][number];

const useChannelFiles = jest.fn();
const useSavedMessages = jest.fn();
const useThreadReplies = jest.fn();
const useUnsaveMessage = jest.fn();
const useSendThreadReply = jest.fn();
const useChatOrgUsers = jest.fn();

jest.mock("@/hooks/api/chat-personal-b", () => ({
  useChannelFiles: (channelId: number) => useChannelFiles(channelId),
}));

jest.mock("@/hooks/api/chat-personal-a", () => ({
  useSavedMessages: () => useSavedMessages(),
  useUnsaveMessage: () => useUnsaveMessage(),
}));

jest.mock("@/hooks/api/chat-search", () => ({
  useThreadReplies: (channelId: number, messageId: number) =>
    useThreadReplies(channelId, messageId),
  useSendThreadReply: () => useSendThreadReply(),
}));

jest.mock("@/hooks/api/chat-core-read", () => ({
  useChatOrgUsers: () => useChatOrgUsers(),
}));

jest.mock("./chat-attachment", () => ({
  ChatAttachment: ({ fileName }: { fileName: string }) => <span>{fileName}</span>,
}));

jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn(), dismiss: jest.fn() }),
}));

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({
    iconRef: { current: null },
    hoverHandlers: { onMouseEnter: jest.fn(), onMouseLeave: jest.fn() },
  }),
}));

const fetchNextPage = jest.fn();

function infiniteResult(pages: unknown[], hasNextPage: boolean) {
  return {
    data: { pages, pageParams: [] },
    isLoading: false,
    isError: false,
    hasNextPage,
    isFetchingNextPage: false,
    fetchNextPage,
    refetch: jest.fn(),
  };
}

function makeFiles(count: number): ChannelFile[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    messageId: i + 1,
    fileName: `file-${i + 1}.pdf`,
    fileUrl: `/files/${i + 1}`,
    fileKey: `org-1/file-${i + 1}.pdf`,
    fileSize: 1024,
    mimeType: "application/pdf",
    createdAt: "2026-01-01T00:00:00.000Z",
  }));
}

function makeSaved(count: number): SavedMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    orgId: "org-1",
    membershipId: 1,
    messageId: i + 1,
    savedAt: "2026-01-01T00:00:00.000Z",
    message: {
      id: i + 1,
      channelId: 1,
      senderId: "user-1",
      sender: { id: "user-1", name: "Ada", image: null },
      content: `saved-${i + 1}`,
      replyToId: null,
      isEdited: false,
      isDeleted: false,
      messageType: "text",
      metadata: null,
      actionStatus: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      attachments: [],
      replyTo: null,
      reactions: {},
      channel: null,
    },
  }));
}

beforeEach(() => {
  jest.clearAllMocks();
  useChatOrgUsers.mockReturnValue({ data: [] });
  useUnsaveMessage.mockReturnValue({ mutateAsync: jest.fn() });
  useSendThreadReply.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
});

const noop = () => undefined;

describe("SharedFilesPanel — the mounted row count is bounded", () => {
  function renderPanel(total: number, hasNextPage = false) {
    useChannelFiles.mockReturnValue(
      infiniteResult([{ files: makeFiles(total), nextCursor: undefined }], hasNextPage),
    );
    return render(<SharedFilesPanel channelId={1} />);
  }

  it("mounts one page of rows for 500 accumulated files, not 500", () => {
    renderPanel(500);
    expect(screen.getAllByRole("listitem")).toHaveLength(PANEL_RENDER_PAGE_SIZE);
  });

  it("mounts every row when the accumulated pages already fit one window", () => {
    renderPanel(12);
    expect(screen.getAllByRole("listitem")).toHaveLength(12);
    expect(screen.queryByRole("button", { name: /next page/i })).toBeNull();
  });

  it("keeps row 51 reachable behind the bound", async () => {
    const user = userEvent.setup();
    renderPanel(500);
    expect(screen.queryByText("file-51.pdf")).toBeNull();
    await user.click(screen.getByRole("button", { name: /next page/i }));
    await user.click(screen.getByRole("button", { name: /next page/i }));
    expect(screen.getByText("file-51.pdf")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(PANEL_RENDER_PAGE_SIZE * 3);
  });

  it("reports the true set size and position, not the window's", () => {
    renderPanel(500);
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveAttribute("aria-setsize", "500");
    expect(rows[0]).toHaveAttribute("aria-posinset", "1");
    expect(rows[PANEL_RENDER_PAGE_SIZE - 1]).toHaveAttribute(
      "aria-posinset",
      String(PANEL_RENDER_PAGE_SIZE),
    );
  });

  it("declares the set size unknown while the cursor has more pages", () => {
    renderPanel(500, true);
    expect(screen.getAllByRole("listitem")[0]).toHaveAttribute("aria-setsize", "-1");
  });

  it("goes back to the first page of rows when the reader switches channel", async () => {
    const user = userEvent.setup();
    useChannelFiles.mockReturnValue(
      infiniteResult([{ files: makeFiles(500), nextCursor: undefined }], false),
    );
    const { rerender } = render(<SharedFilesPanel channelId={1} />);
    await user.click(screen.getByRole("button", { name: /next page/i }));
    expect(screen.getAllByRole("listitem")).toHaveLength(PANEL_RENDER_PAGE_SIZE * 2);
    rerender(<SharedFilesPanel channelId={2} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(PANEL_RENDER_PAGE_SIZE);
  });

  it("names the list for a screen reader", () => {
    renderPanel(500);
    expect(screen.getByRole("list", { name: "Shared files" })).toBeInTheDocument();
  });
});

describe("SharedFilesPanel — revealing held rows is not a cursor request", () => {
  it("reveals what is already held without asking the server for another page", async () => {
    const user = userEvent.setup();
    useChannelFiles.mockReturnValue(
      infiniteResult([{ files: makeFiles(500), nextCursor: 500 }], true),
    );
    render(<SharedFilesPanel channelId={1} />);
    await user.click(screen.getByRole("button", { name: /next page/i }));
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it("asks for the next cursor page only once nothing is held back", async () => {
    const user = userEvent.setup();
    useChannelFiles.mockReturnValue(
      infiniteResult([{ files: makeFiles(10), nextCursor: 10 }], true),
    );
    render(<SharedFilesPanel channelId={1} />);
    await user.click(screen.getByRole("button", { name: /next page/i }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });
});

describe("SavedMessagesPanel — the mounted row count is bounded", () => {
  function renderPanel(total: number, hasNextPage = false) {
    useSavedMessages.mockReturnValue(
      infiniteResult([{ items: makeSaved(total), nextCursor: undefined }], hasNextPage),
    );
    return render(<SavedMessagesPanel onClose={noop} onJumped={noop} />);
  }

  it("mounts one page of cards for 500 saved messages, not 500", () => {
    renderPanel(500);
    expect(screen.getAllByRole("listitem")).toHaveLength(PANEL_RENDER_PAGE_SIZE);
  });

  it("keeps row 51 reachable behind the bound", async () => {
    const user = userEvent.setup();
    renderPanel(500);
    expect(screen.queryByText("saved-51")).toBeNull();
    await user.click(screen.getByRole("button", { name: /next page/i }));
    await user.click(screen.getByRole("button", { name: /next page/i }));
    expect(screen.getByText("saved-51")).toBeInTheDocument();
  });

  it("names the list and reports the true set size", () => {
    renderPanel(500);
    expect(screen.getByRole("list", { name: "Saved messages" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")[0]).toHaveAttribute("aria-setsize", "500");
  });
});

describe("SavedMessagesPanel — saved items are user-global and jump to the exact message", () => {
  it("opens the saved message itself, not just its channel", async () => {
    const user = userEvent.setup();
    const saved = makeSaved(1).map((item) => ({
      ...item,
      messageId: 77,
      message: { ...item.message, id: 77, channelId: 12, channel: { id: 12, name: "launch", type: "PUBLIC" } },
    }));
    useSavedMessages.mockReturnValue(infiniteResult([{ items: saved, nextCursor: undefined }], false));
    const onJumped = jest.fn();
    render(<SavedMessagesPanel onClose={noop} onJumped={onJumped} />);
    await user.click(screen.getByRole("button", { name: "Open saved message in launch" }));
    expect(mockPush).toHaveBeenCalledWith("/chat?channel=12&message=77");
    expect(onJumped).toHaveBeenCalledTimes(1);
  });
});
