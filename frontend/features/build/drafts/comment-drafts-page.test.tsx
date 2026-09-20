import { render, screen } from "@testing-library/react";

const useAccess = jest.fn();
const useMyCommentDrafts = jest.fn();
const useDeleteCommentDraft = jest.fn();
const useDeleteAllCommentDrafts = jest.fn();
const push = jest.fn();

const accessLoading = { data: undefined, isLoading: true };
const accessGranted = {
  data: { isOrgOwner: false, scopes: { "build:tickets:view": "all" }, modules: {} },
  isLoading: false,
};
const accessDenied = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => useAccess(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/build/comment-drafts", () => ({
  useMyCommentDrafts: () => useMyCommentDrafts(),
  useDeleteCommentDraft: () => useDeleteCommentDraft(),
  useDeleteAllCommentDrafts: () => useDeleteAllCommentDrafts(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { CommentDraftsPage } from "./comment-drafts-page";

beforeEach(() => {
  jest.clearAllMocks();
  useAccess.mockReturnValue(accessGranted);
  useMyCommentDrafts.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
  useDeleteCommentDraft.mockReturnValue({ mutate: jest.fn() });
  useDeleteAllCommentDrafts.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

describe("CommentDraftsPage — access is three-valued, not a boolean", () => {
  it("shows the loading skeleton while the access snapshot is still in flight, never a denial", () => {
    useAccess.mockReturnValue(accessLoading);
    useMyCommentDrafts.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<CommentDraftsPage />);

    expect(screen.queryByText(/access restricted/i)).toBeNull();
    expect(screen.queryByText("No drafts saved")).toBeNull();
  });

  it("renders NoPermissionState once build:tickets:view has actually said no, instead of the empty-drafts state", () => {
    useAccess.mockReturnValue(accessDenied);
    useMyCommentDrafts.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<CommentDraftsPage />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.getByText("build:tickets:view")).toBeInTheDocument();
    expect(screen.queryByText("No drafts saved")).not.toBeInTheDocument();
  });
});

describe("CommentDraftsPage — the remaining states", () => {
  it("renders the real empty state once access is granted and there are no drafts", () => {
    render(<CommentDraftsPage />);

    expect(screen.getByText("No drafts saved")).toBeInTheDocument();
    expect(screen.queryByText("Access Restricted")).toBeNull();
  });

  it("renders the error state with a retry when the drafts read fails", () => {
    useMyCommentDrafts.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: jest.fn(),
    });

    render(<CommentDraftsPage />);

    expect(screen.getByRole("button", { name: /try again|retry/i })).toBeInTheDocument();
  });
});
