import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AskOsPanelHeader } from "./ask-os-panel-header";

jest.mock("@/components/brand/animated-logo", () => ({
  AnimatedLogo: () => <span />,
}));

const headerProps = {
  activeConversationId: 1,
  deletePending: false,
  isConversations: false,
  isStreaming: false,
  onBackToChat: jest.fn(),
  onClose: jest.fn(),
  onDeleteActive: jest.fn(),
  onNewChat: jest.fn(),
  onOpenConversations: jest.fn(),
};

describe("Ask OS can fill the viewport from the header without losing the docked panel", () => {
  it("offers Expand on desktop and calls the toggle, then Exit full screen when already expanded", async () => {
    const onToggleExpanded = jest.fn();
    const { rerender } = render(
      <AskOsPanelHeader
        {...headerProps}
        expanded={false}
        showExpand
        onToggleExpanded={onToggleExpanded}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Expand Ask OS" }));
    expect(onToggleExpanded).toHaveBeenCalledTimes(1);

    rerender(
      <AskOsPanelHeader
        {...headerProps}
        expanded
        showExpand
        onToggleExpanded={onToggleExpanded}
      />,
    );
    expect(screen.getByRole("button", { name: "Exit full screen" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Expand Ask OS" })).not.toBeInTheDocument();
  });

  it("hides the expand control on mobile where Ask OS is already full screen", () => {
    render(
      <AskOsPanelHeader
        {...headerProps}
        expanded={false}
        showExpand={false}
        onToggleExpanded={jest.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Expand Ask OS" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Exit full screen" })).not.toBeInTheDocument();
  });
});
