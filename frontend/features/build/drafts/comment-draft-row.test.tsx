import { fireEvent, render, screen } from "@testing-library/react";
import type { CommentDraftListItem } from "@/hooks/api/build/comment-draft-command-cache";
import { CommentDraftRow } from "./comment-draft-row";

const draft: CommentDraftListItem = {
  id: 3,
  orgId: "org-1",
  membershipId: null,
  ticketId: 10,
  body: "Unsent comment",
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-01T10:00:00.000Z",
  ticket: {
    id: 10,
    ticketNumber: 81,
    title: "Review access",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    type: "TASK",
    projectId: 2,
    projectKey: "BLD",
    projectName: "Build",
    assignee: null,
  },
};

const href = "/build/2/tickets/BLD-81?returnTo=%2Fbuild%2Fmy-work%3Fsection%3Ddrafts";

describe("CommentDraftRow", () => {
  it("renders a native ticket link and leaves modifier navigation to the browser", () => {
    const onNavigate = jest.fn();
    render(<CommentDraftRow draft={draft} href={href} onNavigate={onNavigate} onDelete={jest.fn()} />);

    const link = screen.getByRole("link", { name: "Open draft for BLD-81 Review access" });
    expect(link).toHaveAttribute("href", href);

    fireEvent.click(link, { ctrlKey: true });
    fireEvent.click(link, { metaKey: true });
    fireEvent.click(link, { shiftKey: true });
    fireEvent.click(link, { altKey: true });
    expect(onNavigate).not.toHaveBeenCalled();

    fireEvent.click(link);
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith(href);
  });

  it("keeps keyboard deletion separate from ticket navigation", () => {
    const onNavigate = jest.fn();
    const onDelete = jest.fn();
    render(<CommentDraftRow draft={draft} href={href} onNavigate={onNavigate} onDelete={onDelete} />);

    const deleteButton = screen.getByRole("button", { name: "Delete draft for BLD-81" });
    fireEvent.keyDown(deleteButton, { key: "Enter" });
    fireEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(3);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("explains an unavailable ticket without inventing a link and retains deletion", () => {
    const onNavigate = jest.fn();
    const onDelete = jest.fn();
    render(<CommentDraftRow draft={draft} href={null} onNavigate={onNavigate} onDelete={onDelete} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Ticket unavailable. You can still delete this draft.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete draft for BLD-81" }));
    expect(onDelete).toHaveBeenCalledWith(3);
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
