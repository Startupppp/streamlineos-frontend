import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChatBubbleAttachments } from "./chat-bubble-attachments";
import { apiClient } from "@/lib/api-client";
import type { Message } from "@/types/chat";

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/lib/api-client", () => ({ apiClient: { post: jest.fn(), get: jest.fn() } }));
jest.mock("./entity-actions-context", () => ({ useEntityAction: () => undefined }));
jest.mock("./chat-attachment", () => ({ ChatAttachment: () => null }));

const mockedPost = apiClient.post as jest.Mock;

function realtimeMessage(id: number, entities: { type: "doc_page" | "employee" | "deal"; id: string }[]): Message {
  return {
    id,
    channelId: 9,
    senderId: "u_other",
    sender: { id: "u_other", name: "Other", image: null },
    content: null,
    replyToId: null,
    isEdited: false,
    isDeleted: false,
    messageType: "text",
    metadata: { entities },
    actionStatus: null,
    reactions: {},
    clientKey: null,
    createdAt: "2026-10-21T00:00:00.000Z",
    updatedAt: "2026-10-21T00:00:00.000Z",
    attachments: [],
    replyTo: null,
  };
}

function renderMessages(messages: Message[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return render(
    <>
      {messages.map((message) => (
        <ChatBubbleAttachments key={message.id} message={message} metadata={message.metadata} isOwn={false} />
      ))}
    </>,
    { wrapper: Wrapper },
  );
}

afterEach(() => mockedPost.mockReset());

describe("unresolved references on live messages resolve for this reader in one batch", () => {
  it("asks the resolve endpoint once for every distinct reference across messages, then shows the titles", async () => {
    mockedPost.mockResolvedValue({
      references: [
        { type: "doc_page", id: "3", card: { type: "doc_page", id: "3", title: "Onboarding guide", subtitle: null, status: "published", href: "/knowledge/wiki/doc/3" } },
        { type: "employee", id: "u1", card: { type: "employee", id: "u1", title: "Asha Rao", subtitle: null, status: null, href: "/hr/employees/u1" } },
      ],
    });
    renderMessages([
      realtimeMessage(1, [{ type: "doc_page", id: "3" }, { type: "employee", id: "u1" }]),
      realtimeMessage(2, [{ type: "doc_page", id: "3" }]),
    ]);
    expect(await screen.findAllByText("Onboarding guide")).toHaveLength(2);
    expect(screen.getByText("Asha Rao")).toBeInTheDocument();
    expect(mockedPost).toHaveBeenCalledTimes(1);
    const [url, body] = mockedPost.mock.calls[0];
    expect(url).toBe("/chat/channels/9/references/resolve");
    expect(body.refs).toEqual([
      { type: "doc_page", id: "3" },
      { type: "employee", id: "u1" },
    ]);
  });

  it("renders a reference the reader cannot see as a restricted pill with no title", async () => {
    mockedPost.mockResolvedValue({ references: [{ type: "deal", id: "5", card: null }] });
    const { container } = renderMessages([realtimeMessage(3, [{ type: "deal", id: "5" }])]);
    expect(await screen.findByText("Restricted record")).toBeInTheDocument();
    expect(container.textContent).toBe("Restricted record");
  });

  it("does not ask the server for references the message already carries a card for", async () => {
    const message = realtimeMessage(4, []);
    message.metadata = {
      entities: [{ type: "deal", id: "5", card: { type: "deal", id: "5", title: "Acme", subtitle: null, status: null, href: "/crm/deals/5" } }],
    };
    renderMessages([message]);
    expect(screen.getByText("Acme")).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it("splits more than 50 references into calls of at most 50, the endpoint's cap", async () => {
    mockedPost.mockImplementation(async (_url: string, body: { refs: { type: string; id: string }[] }) => ({
      references: body.refs.map((ref) => ({ ...ref, card: null })),
    }));
    const messages = Array.from({ length: 51 }, (_, index) => realtimeMessage(100 + index, [{ type: "doc_page", id: String(index + 1) }]));
    renderMessages(messages);
    await waitFor(() => expect(screen.getAllByText("Restricted record")).toHaveLength(51));
    expect(mockedPost.mock.calls.map(([, body]) => body.refs.length)).toEqual([50, 1]);
  });
});
