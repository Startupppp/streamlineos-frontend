import { render, screen } from "@testing-library/react";
import { MessagePanelThread } from "./message-panel-thread";

jest.mock("next/dynamic", () => () => {
  function ThreadPanelStub({ onClose }: { onClose: () => void }) {
    return (
      <button type="button" onClick={onClose} aria-label="Close thread">
        x
      </button>
    );
  }
  return ThreadPanelStub;
});

const thread = { messageId: 4, channelId: 9, currentUserId: "user-1", onClose: jest.fn() };

describe("MessagePanelThread at 375px", () => {
  it("shows the thread's own close control and no second sheet close button", () => {
    render(<MessagePanelThread thread={thread} isPanelNarrow />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /close/i })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Close thread" })).toBeInTheDocument();
  });
});
