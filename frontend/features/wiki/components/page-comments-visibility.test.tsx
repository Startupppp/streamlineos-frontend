import { render } from "@testing-library/react";
import PageCommentsSheet from "./page-comments-sheet";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
}));

jest.mock("@/hooks/api/kb", () => ({
  useKbPageComments: jest.fn(() => ({
    data: [
      {
        id: 10,
        orgId: "org-1",
        pageId: 1,
        authorId: "user-author",
        authorName: "Alice",
        parentId: null,
        content: "This is a test comment",
        resolvedAt: null,
        createdAt: "2026-09-01T10:00:00.000Z",
        updatedAt: "2026-09-01T10:00:00.000Z",
      },
    ],
    isLoading: false,
  })),
  useCreateKbPageComment: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUpdateKbPageComment: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeleteKbPageComment: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useResolveKbPageComment: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

const { useSession } = jest.requireMock<{ useSession: jest.Mock }>("next-auth/react");
const { useCan } = jest.requireMock<{ useCan: jest.Mock }>("@/hooks/api/access");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PageCommentsSheet — comment action visibility", () => {
  describe("non-author without kb:pages:update", () => {
    beforeEach(() => {
      useSession.mockReturnValue({ data: { user: { id: "user-other" } } });
      useCan.mockReturnValue(false);
    });

    it("does not show Edit button to a non-author without update permission", () => {
      const { queryByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      const editButtons = queryByRole("button", { name: /edit/i });
      expect(editButtons).toBeNull();
    });

    it("does not show Delete button to a non-author without update permission", () => {
      const { queryByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      const deleteButtons = queryByRole("button", { name: /delete/i });
      expect(deleteButtons).toBeNull();
    });

    it("does not show Resolve button without kb:pages:update", () => {
      const { queryByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      const resolveButtons = queryByRole("button", { name: /resolve/i });
      expect(resolveButtons).toBeNull();
    });

    it("still shows Reply button (view-level action, available to all)", () => {
      const { getByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      expect(getByRole("button", { name: /reply/i })).toBeInTheDocument();
    });
  });

  describe("comment author without kb:pages:update", () => {
    beforeEach(() => {
      useSession.mockReturnValue({ data: { user: { id: "user-author" } } });
      useCan.mockReturnValue(false);
    });

    it("shows Edit button to the comment author", () => {
      const { getByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      expect(getByRole("button", { name: /edit/i })).toBeInTheDocument();
    });

    it("shows Delete button to the comment author", () => {
      const { getByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      expect(getByRole("button", { name: /delete/i })).toBeInTheDocument();
    });

    it("does not show Resolve to an author without kb:pages:update", () => {
      const { queryByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      expect(queryByRole("button", { name: /resolve/i })).toBeNull();
    });
  });

  describe("non-author with kb:pages:update (page editor)", () => {
    beforeEach(() => {
      useSession.mockReturnValue({ data: { user: { id: "user-editor" } } });
      useCan.mockReturnValue(true);
    });

    it("shows Edit button via update permission", () => {
      const { getByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      expect(getByRole("button", { name: /edit/i })).toBeInTheDocument();
    });

    it("shows Delete button via update permission", () => {
      const { getByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      expect(getByRole("button", { name: /delete/i })).toBeInTheDocument();
    });

    it("shows Resolve button via kb:pages:update", () => {
      const { getByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      expect(getByRole("button", { name: /resolve/i })).toBeInTheDocument();
    });
  });
});
