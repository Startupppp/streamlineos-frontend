import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expectNoAxeViolations } from "@/test-utils/axe";
import { MessageActions } from "../../chat-message-actions";
import {
  installMessageListEnvironment,
  props as listProps,
} from "../../message-list-test-harness";
import { MessageList } from "../../message-list";

jest.mock("@animateicons/react/lucide", () => ({
  BookmarkCheckIcon: () => null,
  BookmarkPlusIcon: () => null,
  CopyIcon: () => null,
  EllipsisIcon: () => null,
  ReplyIcon: () => null,
  Trash2Icon: () => null,
  UserPlusIcon: () => null,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({
    iconRef: { current: null },
    hoverHandlers: { onMouseEnter: jest.fn(), onMouseLeave: jest.fn() },
  }),
}));

installMessageListEnvironment();

jest.setTimeout(30000);

beforeEach(() => {
  jest.useRealTimers();
});

type ActionProps = React.ComponentProps<typeof MessageActions>;

function actionProps(overrides: Partial<ActionProps> = {}): ActionProps {
  return {
    isOwn: true,
    deleteTitle: "Delete message?",
    isPinned: false,
    isSaved: false,
    hasContent: true,
    canEdit: true,
    canDelete: true,
    canWrite: true,
    canPin: true,
    onOpenThread: jest.fn(),
    onQuoteReply: jest.fn(),
    onSave: jest.fn(),
    onUnsave: jest.fn(),
    onPin: jest.fn(),
    onUnpin: jest.fn(),
    onReact: jest.fn(),
    onCopy: jest.fn(),
    onCopyLink: jest.fn(),
    onForward: jest.fn(),
    canConvertToTask: false,
    onConvertToTask: jest.fn(),
    canAssignTicket: false,
    onAssignTicket: jest.fn(),
    canSetDueDate: false,
    onSetDueDate: jest.fn(),
    onStartEdit: jest.fn(),
    onDelete: jest.fn(),
    ...overrides,
  };
}

describe("message list and actions: axe", () => {
  it("the message list has no violations", async () => {
    const { container } = render(<MessageList {...listProps()} />);
    await expectNoAxeViolations(container);
  });

  it("the actions toolbar has no violations", async () => {
    const { container } = render(<MessageActions {...actionProps()} />);
    await expectNoAxeViolations(container);
  });

  it("the actions toolbar has no violations with the More menu open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<MessageActions {...actionProps()} />);
    await user.click(screen.getByRole("button", { name: "More message actions" }));
    await screen.findByRole("menu");
    await expectNoAxeViolations(baseElement);
  });
});

describe("message actions: keyboard", () => {
  it("Tab lands on the toolbar and arrows move across Reply, React and More", async () => {
    const user = userEvent.setup();
    render(<MessageActions {...actionProps()} />);
    await user.tab();
    expect(screen.getByRole("button", { name: "Reply in thread" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Add reaction" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "More message actions" })).toHaveFocus();
  });

  it("Enter and Space on Reply both open the thread", async () => {
    const user = userEvent.setup();
    const props = actionProps();
    render(<MessageActions {...props} />);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(props.onOpenThread).toHaveBeenCalledTimes(1);
    await user.keyboard(" ");
    expect(props.onOpenThread).toHaveBeenCalledTimes(2);
  });

  it("Enter on More opens a keyboard-reachable menu and Esc closes it back to More", async () => {
    const user = userEvent.setup();
    render(<MessageActions {...actionProps()} />);
    const more = screen.getByRole("button", { name: "More message actions" });
    more.focus();
    await user.keyboard("{Enter}");
    const menu = await screen.findByRole("menu");
    expect(within(menu).getAllByRole("menuitem").length).toBeGreaterThan(0);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(more).toHaveFocus();
  });
});

describe("message actions: screen reader and touch", () => {
  it("names the toolbar and every control in it", () => {
    render(<MessageActions {...actionProps()} />);
    const toolbar = screen.getByRole("toolbar", { name: "Message actions" });
    for (const button of within(toolbar).getAllByRole("button")) {
      expect(button).toHaveAccessibleName();
    }
  });

  it("is revealed without hover on touch screens and on keyboard focus", () => {
    render(<MessageActions {...actionProps()} />);
    const root = screen.getByRole("toolbar", { name: "Message actions" }).parentElement;
    expect(root?.className).toContain("[@media(hover:none)]:opacity-100");
    expect(root?.className).toContain("focus-within:opacity-100");
  });
});
