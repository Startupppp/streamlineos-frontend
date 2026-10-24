import { render } from "@testing-library/react";
import {
  baseChannelResult,
  mockUseCanState,
  mockUseCan,
  mockUseChatOutboxDrain,
  mockUseCreateEntityChannel,
  mockUseEntityChannel,
  mockUsePageState,
} from "@/features/chat/build-project-chat-page-test-harness";
import { TicketDetailSheet } from "./ticket-detail-sheet";

jest.mock("@/hooks/api/support", () => ({
  useSupportTicket: (_ticketId: number) => ({
    data: { id: _ticketId, title: "Test Ticket" },
    isLoading: false,
  }),
}));

jest.mock("@/hooks/api/support/realtime", () => ({
  useSupportRealtime: () => undefined,
}));

jest.mock("./ticket-detail-header", () => ({
  TicketDetailHeader: () => null,
}));
jest.mock("./ticket-detail-timeline", () => ({
  TicketDetailTimeline: () => null,
}));
jest.mock("./ticket-detail-relations", () => ({
  TicketDetailRelations: () => null,
}));
jest.mock("./ticket-external-links-section", () => ({
  TicketExternalLinksSection: () => null,
}));
jest.mock("./ticket-reply-composer", () => ({
  TicketReplyComposer: () => null,
}));
jest.mock("./ticket-kb-deflection-panel", () => ({
  KbDeflectionPanel: () => null,
}));
jest.mock("./ticket-ai-panel", () => ({
  TicketAiPanel: () => null,
}));
jest.mock("./use-inbox-shortcuts", () => ({
  SUPPORT_INSERT_REPLY_DRAFT_EVENT: "support:insert-reply-draft",
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(false);
  mockUseCanState.mockReturnValue("allowed");
  mockUseEntityChannel.mockReturnValue(baseChannelResult());
  mockUseCreateEntityChannel.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUsePageState.mockReturnValue({ kind: "loading" });
  mockUseChatOutboxDrain.mockReturnValue(undefined);
});

describe("TicketDetailSheet — chat panel", () => {
  it("calls useEntityChannel with type 'support_ticket' and the ticketId as a string", () => {
    render(<TicketDetailSheet ticketId={7} onBack={jest.fn()} />);
    expect(mockUseEntityChannel).toHaveBeenCalledWith("support_ticket", "7");
  });

  it("calls useEntityChannel with the correct id for a different ticket", () => {
    render(<TicketDetailSheet ticketId={55} onBack={jest.fn()} />);
    expect(mockUseEntityChannel).toHaveBeenCalledWith("support_ticket", "55");
  });

  it("does not call useEntityChannel when chat access is denied", () => {
    mockUseCanState.mockReturnValue("denied");
    render(<TicketDetailSheet ticketId={7} onBack={jest.fn()} />);
    expect(mockUseEntityChannel).not.toHaveBeenCalled();
  });
});
