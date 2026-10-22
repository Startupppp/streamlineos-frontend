import React from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageActions } from "./chat-message-actions";

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
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: { onMouseEnter: jest.fn(), onMouseLeave: jest.fn() } }),
}));

type Props = React.ComponentProps<typeof MessageActions>;

function makeProps(overrides: Partial<Props> = {}): Props {
  return {
    isOwn: true,
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
    deleteTitle: 'Delete message from Ada: "hello"?',
    ...overrides,
  };
}

async function openMoreWithKeyboard(user: ReturnType<typeof userEvent.setup>) {
  await user.tab();
  await user.keyboard("{ArrowRight}{ArrowRight}");
  expect(screen.getByRole("button", { name: "More message actions" })).toHaveFocus();
  await user.keyboard("{Enter}");
  return screen.findByRole("menu");
}

describe("MessageActions — three primary actions, everything else behind More", () => {
  it("shows only Reply, React and More as primary buttons so the row stays compact", () => {
    render(<MessageActions {...makeProps()} />);
    const toolbar = screen.getByRole("toolbar", { name: "Message actions" });
    const buttons = within(toolbar).getAllByRole("button");
    expect(buttons.map((b) => b.getAttribute("aria-label"))).toEqual([
      "Reply in thread",
      "Add reaction",
      "More message actions",
    ]);
  });

  it("Reply opens the thread, because threads are the reply model", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<MessageActions {...props} />);
    await user.click(screen.getByRole("button", { name: "Reply in thread" }));
    expect(props.onOpenThread).toHaveBeenCalledTimes(1);
  });

  it("puts save, pin, copy, link, forward, edit and delete inside More", async () => {
    const user = userEvent.setup();
    render(<MessageActions {...makeProps()} />);
    const menu = await openMoreWithKeyboard(user);
    const names = within(menu).getAllByRole("menuitem").map((item) => item.textContent);
    expect(names).toEqual(
      expect.arrayContaining([
        "Save message",
        "Pin message",
        "Copy text",
        "Copy link",
        "Forward",
        "Quote reply",
        "Edit",
        "Delete",
      ]),
    );
  });
});

describe("MessageActions — reachable without a mouse", () => {
  it("reveals the toolbar on focus-within and always on touch screens, not only on hover", () => {
    render(<MessageActions {...makeProps()} />);
    const root = screen.getByRole("toolbar", { name: "Message actions" }).parentElement;
    expect(root?.className).toContain("focus-within:opacity-100");
    expect(root?.className).toContain("group-hover:opacity-100");
    expect(root?.className).toContain("[@media(hover:none)]:opacity-100");
  });

  it("opens More from the keyboard and runs an item with Enter", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<MessageActions {...props} />);
    await openMoreWithKeyboard(user);
    const item = screen.getByRole("menuitem", { name: "Copy link" });
    item.focus();
    await user.keyboard("{Enter}");
    expect(props.onCopyLink).toHaveBeenCalledTimes(1);
  });

  it("opens the quick reaction picker from the React button and reacts", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<MessageActions {...props} />);
    await user.click(screen.getByRole("button", { name: "Add reaction" }));
    await user.click(await screen.findByRole("button", { name: "React with 👍" }));
    expect(props.onReact).toHaveBeenCalledWith("👍");
  });
});

describe("MessageActions — delete is confirmed and permission-gated", () => {
  it("asks for confirmation before calling the delete mutation", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<MessageActions {...props} />);
    await openMoreWithKeyboard(user);
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText('Delete message from Ada: "hello"?')).toBeInTheDocument();
    expect(props.onDelete).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Delete message" }));
    await waitFor(() => expect(props.onDelete).toHaveBeenCalledTimes(1));
  });

  it("cancelling the confirmation leaves the message alone", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<MessageActions {...props} />);
    await openMoreWithKeyboard(user);
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(props.onDelete).not.toHaveBeenCalled();
  });

  it("offers no Delete or Edit to a user who may not change the message", async () => {
    const user = userEvent.setup();
    render(<MessageActions {...makeProps({ isOwn: false, canEdit: false, canDelete: false })} />);
    await openMoreWithKeyboard(user);
    expect(screen.queryByRole("menuitem", { name: "Delete" })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "Edit" })).toBeNull();
  });

  it("has no hover-only delete submenu", () => {
    render(<MessageActions {...makeProps()} />);
    expect(screen.queryByText("Delete for Everyone")).toBeNull();
  });
});

describe("MessageActions — entity actions follow permission", () => {
  it("hides convert, assign and due-date when the user holds none of them", async () => {
    const user = userEvent.setup();
    render(<MessageActions {...makeProps()} />);
    await openMoreWithKeyboard(user);
    expect(screen.queryByRole("menuitem", { name: "Convert to task" })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "Assign ticket" })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "Set due date" })).toBeNull();
  });

  it("shows each entity action the user is allowed to run", async () => {
    const user = userEvent.setup();
    const props = makeProps({ canConvertToTask: true, canAssignTicket: true, canSetDueDate: true });
    render(<MessageActions {...props} />);
    await openMoreWithKeyboard(user);
    expect(screen.getByRole("menuitem", { name: "Assign ticket" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Set due date" })).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Convert to task" }));
    expect(props.onConvertToTask).toHaveBeenCalledTimes(1);
  });
});

describe("MessageActions — pin follows chat:messages:pin and unpin is confirmed", () => {
  it("pins an unpinned message in one step", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<MessageActions {...props} />);
    await openMoreWithKeyboard(user);
    await user.click(screen.getByRole("menuitem", { name: "Pin message" }));
    expect(props.onPin).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("asks before unpinning, matching the Details panel", async () => {
    const user = userEvent.setup();
    const props = makeProps({ isPinned: true });
    render(<MessageActions {...props} />);
    await openMoreWithKeyboard(user);
    await user.click(screen.getByRole("menuitem", { name: "Unpin message" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(props.onUnpin).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Unpin" }));
    await waitFor(() => expect(props.onUnpin).toHaveBeenCalledTimes(1));
  });

  it("offers no Pin or Unpin without the pin permission", async () => {
    const user = userEvent.setup();
    render(<MessageActions {...makeProps({ canPin: false, isPinned: true })} />);
    await openMoreWithKeyboard(user);
    expect(screen.queryByRole("menuitem", { name: /pin message/i })).toBeNull();
  });
});

describe("MessageActions — forward and quote need write access", () => {
  it("shows Forward and Quote reply to a user who can write", async () => {
    const user = userEvent.setup();
    render(<MessageActions {...makeProps()} />);
    await openMoreWithKeyboard(user);
    expect(screen.getByRole("menuitem", { name: "Forward" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Quote reply" })).toBeInTheDocument();
  });

  it("hides Forward and Quote reply from a read-only user", async () => {
    const user = userEvent.setup();
    render(<MessageActions {...makeProps({ canWrite: false })} />);
    await openMoreWithKeyboard(user);
    expect(screen.queryByRole("menuitem", { name: "Forward" })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "Quote reply" })).toBeNull();
  });
});

describe("MessageActions — one tab stop per message, arrows inside the toolbar", () => {
  it("puts only Reply in the tab order and reaches React and More with the arrow keys", async () => {
    const user = userEvent.setup();
    render(
      <>
        <MessageActions {...makeProps()} />
        <button type="button">after</button>
      </>,
    );
    await user.tab();
    expect(screen.getByRole("button", { name: "Reply in thread" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Add reaction" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("button", { name: "More message actions" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Reply in thread" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("button", { name: "More message actions" })).toHaveFocus();
    await user.keyboard("{Home}");
    await user.tab();
    expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
  });
});
