import { render, screen, waitFor } from "@testing-library/react";
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
      });
    },
  ),
}));

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
      await screen.findByRole("button", { name: /replace page draft/i }),
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
      await screen.findByRole("button", { name: /replace page draft/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/improved draft content/)).toBeInTheDocument();
    });
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
      await screen.findByRole("button", { name: /replace page draft/i }),
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
      await screen.findByRole("button", { name: /replace page draft/i }),
    );
    await screen.findByRole("dialog", { name: /review proposed changes/i });
    await user.click(screen.getByRole("button", { name: /apply changes/i }));

    expect(onApplyImprovement).toHaveBeenCalledWith("improved draft content");
  });
});
