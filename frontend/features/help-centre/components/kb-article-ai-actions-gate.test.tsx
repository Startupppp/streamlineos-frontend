import { render } from "@testing-library/react";
import { KbArticleAiActions } from "./kb-article-ai-actions";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
}));

jest.mock("@/hooks/api/kb/article-ai", () => ({
  useKbArticleSummarize: jest.fn(() => ({ mutateAsync: jest.fn() })),
  useKbArticleAsk: jest.fn(() => ({ mutateAsync: jest.fn() })),
  useKbArticleImprove: jest.fn(() => ({ mutateAsync: jest.fn() })),
  useKbArticleSuggestRelated: jest.fn(() => ({ mutateAsync: jest.fn() })),
}));

jest.mock("@/components/ai", () => ({
  AiActionsMenu: () => <div data-testid="ai-actions-menu" />,
}));

const { useCan } = jest.requireMock<{ useCan: jest.Mock }>("@/hooks/api/access");

beforeEach(() => {
  useCan.mockReturnValue(false);
});

describe("KbArticleAiActions — kb:ai:generate gate", () => {
  it("renders nothing when kb:ai:generate is not granted", () => {
    useCan.mockReturnValue(false);
    const { container } = render(<KbArticleAiActions articleId={1} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the AI menu when kb:ai:generate is granted", () => {
    useCan.mockReturnValue(true);
    const { getByTestId } = render(<KbArticleAiActions articleId={1} />);
    expect(getByTestId("ai-actions-menu")).toBeTruthy();
  });

  it("gates on kb:ai:generate specifically", () => {
    render(<KbArticleAiActions articleId={1} />);
    expect(useCan).toHaveBeenCalledWith("kb:ai:generate");
  });
});
