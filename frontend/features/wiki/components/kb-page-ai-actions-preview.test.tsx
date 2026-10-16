import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KbPageAiActions } from "./kb-page-ai-actions";

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/components/kb/kb-doc-ask-sheet", () => ({
  KbDocAskSheet: () => null,
}));
jest.mock("@/hooks/api/kb/doc-ai-stream", () => ({
  streamKbDocAi: jest.fn(
    ({ onToken }: { onToken?: (t: string) => void }) => {
      onToken?.("improved draft content");
      return Promise.resolve({
        status: "completed" as const,
        text: "improved draft content",
        headers: new Headers(),
        citations: [{ id: 1, title: "Current page" }],
      });
    },
  ),
}));

const { streamKbDocAi } = jest.requireMock("@/hooks/api/kb/doc-ai-stream") as {
  streamKbDocAi: jest.Mock;
};

async function openMenuAndClickImprove(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.click(screen.getByRole("button", { name: /^ai$/i }));
  await user.click(await screen.findByRole("menuitem", { name: /improve writing/i }));
}

describe("KbPageAiActions — improve confirmation before content mutates", () => {
  it("improve action does not call onApplyImprovement before the user confirms in the diff dialog", async () => {
    const onApplyImprovement = jest.fn();
    const user = userEvent.setup();
    render(
      <KbPageAiActions
        pageId={1}
        onApplyImprovement={onApplyImprovement}
        currentContent="original content"
      />,
    );

    await openMenuAndClickImprove(user);
    await user.click(
      await screen.findByRole("button", { name: /preview changes/i }),
    );

    expect(onApplyImprovement).not.toHaveBeenCalled();
    expect(
      await screen.findByRole("dialog", { name: /review proposed changes/i }),
    ).toBeInTheDocument();
  });

  it("diff dialog surfaces the generated text before the user confirms", async () => {
    const user = userEvent.setup();
    render(
      <KbPageAiActions
        pageId={1}
        onApplyImprovement={jest.fn()}
        currentContent="original content"
      />,
    );

    await openMenuAndClickImprove(user);
    await user.click(
      await screen.findByRole("button", { name: /preview changes/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/improved draft content/)).toBeInTheDocument();
    });
    const dialog = screen.getByRole("dialog", { name: /review proposed changes/i });
    expect(within(dialog).getByText("Sources")).toBeInTheDocument();
    expect(within(dialog).getByText("Current page")).toBeInTheDocument();
  });

  it("discard in the diff dialog leaves onApplyImprovement uncalled", async () => {
    const onApplyImprovement = jest.fn();
    const user = userEvent.setup();
    render(
      <KbPageAiActions
        pageId={1}
        onApplyImprovement={onApplyImprovement}
        currentContent="original content"
      />,
    );

    await openMenuAndClickImprove(user);
    await user.click(
      await screen.findByRole("button", { name: /preview changes/i }),
    );
    await screen.findByRole("dialog", { name: /review proposed changes/i });
    await user.click(screen.getByRole("button", { name: /^discard$/i }));

    expect(onApplyImprovement).not.toHaveBeenCalled();
  });

  it("confirm in the diff dialog calls onApplyImprovement with the generated text", async () => {
    const onApplyImprovement = jest.fn();
    const user = userEvent.setup();
    render(
      <KbPageAiActions
        pageId={1}
        onApplyImprovement={onApplyImprovement}
        currentContent="original content"
      />,
    );

    await openMenuAndClickImprove(user);
    await user.click(
      await screen.findByRole("button", { name: /preview changes/i }),
    );
    await screen.findByRole("dialog", { name: /review proposed changes/i });
    await user.click(screen.getByRole("button", { name: /apply changes/i }));

    expect(onApplyImprovement).toHaveBeenCalledWith("improved draft content");
  });

  it("previews the sourced page diff before inserting a summary", async () => {
    const onInsertSummary = jest.fn();
    const user = userEvent.setup();
    render(
      <KbPageAiActions
        pageId={1}
        onInsertSummary={onInsertSummary}
        currentContent="original content"
      />,
    );

    await user.click(screen.getByRole("button", { name: /^ai$/i }));
    await user.click(await screen.findByRole("menuitem", { name: /summarize/i }));
    await user.click(await screen.findByRole("button", { name: /preview insertion/i }));

    expect(onInsertSummary).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("dialog", { name: /review summary insertion/i });
    const diff = within(dialog).getByRole("region", { name: /content diff/i });
    expect(diff).toHaveTextContent("improved draft content");
    expect(diff).toHaveTextContent("original content");
    expect(within(dialog).getByText("Current page")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: /insert summary/i }));
    expect(onInsertSummary).toHaveBeenCalledWith("improved draft content");
  });

  it("does not offer an apply path for a draft without a verified source", async () => {
    const onApplyImprovement = jest.fn();
    streamKbDocAi.mockResolvedValueOnce({
      status: "completed",
      text: "unsourced draft",
      headers: new Headers(),
    });
    const user = userEvent.setup();
    render(<KbPageAiActions pageId={1} onApplyImprovement={onApplyImprovement} />);

    await openMenuAndClickImprove(user);

    expect(await screen.findByText(/source for this ai draft could not be verified/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /preview changes/i })).not.toBeInTheDocument();
    expect(onApplyImprovement).not.toHaveBeenCalled();
  });

  it("does not make a cancelled partial stream applyable", async () => {
    const onApplyImprovement = jest.fn();
    streamKbDocAi.mockResolvedValueOnce({ status: "cancelled", text: "partial draft" });
    const user = userEvent.setup();
    render(<KbPageAiActions pageId={1} onApplyImprovement={onApplyImprovement} />);

    await openMenuAndClickImprove(user);

    expect(await screen.findByText(/^stopped$/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /preview changes/i })).not.toBeInTheDocument();
    expect(onApplyImprovement).not.toHaveBeenCalled();
  });
});
