/**
 * `GET /chat/users` returns the whole organisation with no cursor. Both the
 * new-DM picker and the add-members picker rendered every row into a fixed
 * 280–340px box, so an org of 2,000 people mounted 2,000 buttons to show 6.
 */
import { render, screen } from "@testing-library/react";
import { ChatUserVirtualList } from "./chat-user-virtual-list";
import type { OrgUser } from "@/types/chat";

interface MockListProps {
  rowCount: number;
  rowHeight: number;
  "aria-label"?: string;
}

jest.mock("react-window", () => ({
  List: jest.fn(({ rowCount, rowHeight, "aria-label": ariaLabel }: MockListProps) => (
    <div
      role="list"
      aria-label={ariaLabel}
      data-testid="virtual-list"
      data-row-count={String(rowCount)}
      data-row-height={String(rowHeight)}
    />
  )),
}));

function makeUsers(count: number): OrgUser[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `user-${i + 1}`,
    name: `Person ${i + 1}`,
    email: `person${i + 1}@example.com`,
    image: null,
    role: "MEMBER",
  }));
}

const renderUser = (user: OrgUser) => <button type="button">{user.name}</button>;

describe("ChatUserVirtualList", () => {
  it("hands the whole org to react-window instead of mounting a row each", () => {
    render(
      <ChatUserVirtualList
        users={makeUsers(2000)}
        rowHeight={56}
        listHeight={332}
        ariaLabel="People you can message"
        renderUser={renderUser}
      />,
    );

    const list = screen.getByTestId("virtual-list");
    expect(list.getAttribute("data-row-count")).toBe("2000");
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("keeps the list labelled, so the picker still announces itself", () => {
    render(
      <ChatUserVirtualList
        users={makeUsers(3)}
        rowHeight={52}
        listHeight={272}
        ariaLabel="People you can add to this channel"
        renderUser={renderUser}
      />,
    );

    expect(
      screen.getByRole("list", { name: "People you can add to this channel" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("virtual-list").getAttribute("data-row-height")).toBe("52");
  });
});
