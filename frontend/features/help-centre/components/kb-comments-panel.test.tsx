import { fireEvent, render, screen } from "@testing-library/react";
import { permissionGate } from "@/lib/rbac/permission-gate";
import type { KbArticleDetail } from "@/hooks/api/support/kb";
import { KbCommentsPanel } from "./kb-comments-panel";

jest.mock("@/hooks/api/support/kb-comments", () => ({
  useSupportKbComments: jest.fn(),
  useAddSupportKbComment: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeleteSupportKbComment: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

const { useSupportKbComments } = jest.requireMock("@/hooks/api/support/kb-comments") as {
  useSupportKbComments: jest.Mock;
};
const article = { id: 4 } as KbArticleDetail;
const comment = {
  id: 10,
  articleId: 4,
  body: "First page note",
  userId: "user-1",
  userName: "Ada",
  userImage: null,
  createdAt: "2026-10-16T00:00:00.000Z",
  updatedAt: "2026-10-16T00:00:00.000Z",
};

beforeEach(() => {
  jest.clearAllMocks();
  useSupportKbComments.mockReturnValue({
    data: [comment],
    isLoading: false,
    isError: false,
    error: null,
    access: permissionGate("support:kb:view", true, true),
    hasNextPage: false,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
  });
});

describe("Support Knowledge Base comments panel pagination", () => {
  it("keeps loaded comments visible and fetches another page on request", () => {
    const fetchNextPage = jest.fn();
    useSupportKbComments.mockReturnValue({
      ...useSupportKbComments(),
      hasNextPage: true,
      fetchNextPage,
    });

    render(<KbCommentsPanel article={article} />);

    expect(screen.getByText("First page note")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Load more comments" }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("keeps loaded comments visible and offers retry after a later page fails", () => {
    const fetchNextPage = jest.fn();
    useSupportKbComments.mockReturnValue({
      ...useSupportKbComments(),
      isError: true,
      isFetchNextPageError: true,
      error: new Error("Connection lost"),
      hasNextPage: true,
      fetchNextPage,
    });

    render(<KbCommentsPanel article={article} />);

    expect(screen.getByText("First page note")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Connection lost");
    fireEvent.click(screen.getByRole("button", { name: "Retry loading comments" }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("does not report empty comments when the read is denied", () => {
    useSupportKbComments.mockReturnValue({
      ...useSupportKbComments(),
      data: undefined,
      access: permissionGate("support:kb:view", false, true),
    });

    render(<KbCommentsPanel article={article} />);

    expect(screen.queryByText("No comments yet")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Access Restricted" })).toBeInTheDocument();
  });
});
