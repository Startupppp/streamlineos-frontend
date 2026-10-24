import { render, screen } from "@testing-library/react";
import {
  RecordConversation,
  RecordConversationSlotProvider,
  type RecordConversationProps,
} from "./record-conversation-slot";

function renderPanel({ entityType, entityId }: RecordConversationProps) {
  return <div data-testid="panel">{`${entityType}:${entityId}`}</div>;
}

describe("RecordConversation slot", () => {
  it("renders the conversation the app layer provides for the record, so a module page never imports Chat", () => {
    render(
      <RecordConversationSlotProvider render={renderPanel}>
        <RecordConversation entityType="deal" entityId="42" />
      </RecordConversationSlotProvider>,
    );
    expect(screen.getByTestId("panel")).toHaveTextContent("deal:42");
  });

  it("renders nothing outside the authenticated shell, where no conversation is provided", () => {
    const { container } = render(<RecordConversation entityType="deal" entityId="42" />);
    expect(container).toBeEmptyDOMElement();
  });
});
