import type { ReactNode } from "react";
import { render, screen, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KbArticleAiActions } from "./kb-article-ai-actions";
import type { AiAction } from "@/components/ai";

jest.mock("@/hooks/api/access", () => ({ useCan: jest.fn(() => true) }));

const mockAskMutateAsync = jest.fn();

jest.mock("@/hooks/api/kb/article-ai", () => ({
  useKbArticleSummarize: jest.fn(() => ({ mutateAsync: jest.fn() })),
  useKbArticleAsk: jest.fn(() => ({ mutateAsync: mockAskMutateAsync })),
  useKbArticleImprove: jest.fn(() => ({ mutateAsync: jest.fn() })),
  useKbArticleSuggestRelated: jest.fn(() => ({ mutateAsync: jest.fn() })),
}));

jest.mock("@/components/ai", () => ({
  AiActionsMenu: ({ actions }: { actions: AiAction[] }) => (
    <div>
      {actions.map((a) => (
        <button key={a.key} data-testid={`ai-${a.key}`} onClick={() => { void a.run(); }}>
          {a.key}
        </button>
      ))}
    </div>
  ),
}));

jest.mock("@/components/ai/ai-draft-card", () => ({
  AiDraftCard: ({ children }: { children: ReactNode }) => <div data-testid="ai-draft">{children}</div>,
}));

jest.mock("@/components/ai/ai-quota-empty-state", () => ({
  AiQuotaEmptyState: () => <div data-testid="ai-quota" />,
}));

jest.mock("@/components/ai/ai-permission-denied", () => ({
  AiPermissionDenied: () => <div data-testid="ai-denied" />,
}));

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange?: (v: boolean) => void;
    children: ReactNode;
  }) =>
    open ? (
      <div data-testid="ask-sheet">
        <button data-testid="sheet-close" onClick={() => onOpenChange?.(false)}>
          close
        </button>
        {children}
      </div>
    ) : null,
  SheetContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SheetHeader: ({ children }: { children: ReactNode }) => <>{children}</>,
  SheetTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

describe("KbArticleAiActions — invokeRef stamp guard", () => {
  beforeEach(() => {
    mockAskMutateAsync.mockReset();
  });

  it("does not overwrite loading state with a stale ask result from a prior invocation", async () => {
    const user = userEvent.setup();

    const resolvers: Array<(v: { text: string; aiUsage: null }) => void> = [];
    mockAskMutateAsync.mockImplementation(
      () =>
        new Promise<{ text: string; aiUsage: null }>((r) => {
          resolvers.push(r);
        }),
    );

    render(<KbArticleAiActions articleId={1} />);

    await user.click(screen.getByTestId("ai-ask"));
    expect(screen.getByTestId("ask-sheet")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/prerequisites/i), "First question?");
    await user.click(within(screen.getByTestId("ask-sheet")).getByRole("button", { name: /^ask$/i }));

    await user.click(screen.getByTestId("sheet-close"));
    expect(screen.queryByTestId("ask-sheet")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("ai-ask"));
    await user.type(screen.getByPlaceholderText(/prerequisites/i), "Second question?");
    await user.click(within(screen.getByTestId("ask-sheet")).getByRole("button", { name: /^ask$/i }));

    expect(resolvers).toHaveLength(2);

    await act(async () => {
      resolvers[0]!({ text: "stale answer", aiUsage: null });
    });

    expect(screen.queryByText("stale answer")).not.toBeInTheDocument();

    await act(async () => {
      resolvers[1]!({ text: "correct answer", aiUsage: null });
    });

    expect(screen.getByText("correct answer")).toBeInTheDocument();
  });
});
