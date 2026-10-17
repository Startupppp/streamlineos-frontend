import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { permissionGate } from "@/lib/rbac/permission-gate";
import { KbArticleEditorPage } from "./kb-article-editor-page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/support/kb/1",
  useSearchParams: () => new URLSearchParams(),
}));

const useSupportKbArticle = jest.fn();
const useSupportKbCategories = jest.fn();

jest.mock("@/hooks/api/support/kb", () => ({
  useSupportKbArticle: (...args: unknown[]) => useSupportKbArticle(...args),
  useSupportKbCategories: (...args: unknown[]) =>
    useSupportKbCategories(...args),
}));

jest.mock("./kb-article-editor", () => ({
  KbArticleEditor: () => <div data-testid="kb-article-editor" />,
}));

const ALLOWED = permissionGate("support:kb:view", true, true);
const DENIED = permissionGate("support:kb:view", false, true);
const PENDING = permissionGate("support:kb:view", false, false);

const ARTICLE = { id: 1, title: "Resetting your password" };

function articleQuery(overrides: Record<string, unknown>) {
  return {
    data: undefined,
    error: null,
    isLoading: false,
    isFetching: false,
    refetch: jest.fn(),
    access: ALLOWED,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useSupportKbCategories.mockReturnValue({ data: [] });
  useSupportKbArticle.mockReturnValue(articleQuery({ data: ARTICLE }));
});

describe("KbArticleEditorPage — a refused read is not a missing article", () => {
  it("renders the editor when the read is permitted and returns the article, so the negative cases below are not vacuous", () => {
    render(<KbArticleEditorPage articleId={1} />);

    expect(screen.getByTestId("kb-article-editor")).toBeInTheDocument();
  });

  it("renders a real not-found when the read is permitted and the article genuinely does not exist", () => {
    useSupportKbArticle.mockReturnValue(
      articleQuery({
        error: new ApiError("Not found", 404, "NOT_FOUND"),
      }),
    );

    render(<KbArticleEditorPage articleId={1} />);

    expect(
      screen.getByRole("heading", { name: "Article not found", level: 2 }),
    ).toBeInTheDocument();
  });

  it("renders a permission refusal, not the not-found, when support:kb:view is denied", () => {
    useSupportKbArticle.mockReturnValue(articleQuery({ access: DENIED }));

    render(<KbArticleEditorPage articleId={1} />);

    expect(
      screen.queryByRole("heading", { name: "Article not found", level: 2 }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("kb-article-editor")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /access/i })).toBeInTheDocument();
  });

  it("does not claim a refusal while the permission gate is still pending, because an unresolved gate is not a denial", () => {
    useSupportKbArticle.mockReturnValue(articleQuery({ access: PENDING }));

    render(<KbArticleEditorPage articleId={1} />);

    expect(
      screen.queryByRole("heading", { name: /access/i }),
    ).not.toBeInTheDocument();
  });
});

describe("KbArticleEditorPage — the load failure quotes its request id", () => {
  it("shows the correlation id of the failed article read so the user can quote it to support", () => {
    useSupportKbArticle.mockReturnValue(
      articleQuery({
        error: new ApiError("Upstream exploded", 500, "INTERNAL", {
          correlationId: "req_kb_article_77",
        }),
      }),
    );

    render(<KbArticleEditorPage articleId={1} />);

    expect(screen.getByText("Failed to load article")).toBeInTheDocument();
    expect(screen.getByText("req_kb_article_77")).toBeInTheDocument();
  });

  it("shows the failure with no reference line when the error carries no correlation id, so the reference is evidence and not decoration", () => {
    useSupportKbArticle.mockReturnValue(
      articleQuery({ error: new Error("network down") }),
    );

    render(<KbArticleEditorPage articleId={1} />);

    expect(screen.getByText("Failed to load article")).toBeInTheDocument();
    expect(screen.queryByText("Reference")).not.toBeInTheDocument();
  });
});
