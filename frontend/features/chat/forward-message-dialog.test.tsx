const mockMutateAsync = jest.fn();

jest.mock("@/hooks/api/chat-core-read", () => ({
  useChatChannels: jest.fn(() => ({
    channels: [{ id: 7, name: "design", type: "GROUP" }],
    hasMore: false,
    isTruncated: false,
    isFetchingNextPage: false,
    loadMore: jest.fn(),
  })),
}));

jest.mock("@/hooks/api/chat-core-mutations-a", () => ({
  useSendMessage: jest.fn(() => ({ mutateAsync: mockMutateAsync, isPending: false })),
}));

jest.mock("@/components/ui/infinite-scroll-sentinel", () => ({
  InfiniteScrollSentinel: () => null,
}));

jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() }),
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ForwardMessageDialog, type ForwardableMessage } from "./forward-message-dialog";

const card = {
  type: "doc_page",
  id: "1",
  title: "Onboarding guide",
  subtitle: null,
  status: "published",
  href: "/knowledge/wiki/doc/1",
};

function linkOnlyMessage(count: number): ForwardableMessage {
  return {
    content: null,
    attachments: [],
    metadata: {
      entities: Array.from({ length: count }, (_, index) => ({
        type: "doc_page" as const,
        id: String(index + 1),
        card: { ...card, id: String(index + 1) },
      })),
    },
  };
}

async function forward(message: ForwardableMessage) {
  render(<ForwardMessageDialog message={message} open onOpenChange={jest.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "design" }));
  fireEvent.click(screen.getByRole("button", { name: "Forward" }));
  await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));
  return mockMutateAsync.mock.calls[0]?.[0];
}

describe("ForwardMessageDialog", () => {
  beforeEach(() => {
    mockMutateAsync.mockReset();
    mockMutateAsync.mockResolvedValue({});
  });

  it("forwards a link-only message with the source's {type,id} references and no resolved card snapshot", async () => {
    const sent = await forward(linkOnlyMessage(2));

    expect(sent).toEqual({
      channelId: 7,
      content: undefined,
      metadata: {
        forwardCount: 1,
        entities: [
          { type: "doc_page", id: "1" },
          { type: "doc_page", id: "2" },
        ],
      },
      attachments: [],
    });
    expect(JSON.stringify(sent)).not.toContain("Onboarding guide");
  });

  it("caps forwarded references at ten, the most the send route accepts", async () => {
    const sent = await forward(linkOnlyMessage(12));

    expect(sent.metadata.entities).toHaveLength(10);
    expect(sent.metadata.entities.at(-1)).toEqual({ type: "doc_page", id: "10" });
  });

  it("sends no entities key when the source message links nothing", async () => {
    const sent = await forward({ content: "hello", attachments: [], metadata: null });

    expect(sent.metadata).toEqual({ forwardCount: 1 });
    expect(sent.content).toBe("hello");
  });
});
