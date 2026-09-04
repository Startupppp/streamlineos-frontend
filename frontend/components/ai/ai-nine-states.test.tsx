import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiActionResultBody, type AiActionResultState } from "./ai-action-result-body";
import { AiInlinePreview, type AiInlineSession } from "./ai-inline-preview";

interface Case {
  boundary: string;
  state: AiActionResultState;
  shows: RegExp;
  labelled?: RegExp;
  /** What the surface declares about sources; see `expectsCitations`. */
  expectsCitations?: boolean;
  offersRetry: boolean;
}

const CASES: Case[] = [
  {
    boundary: "credit exhaustion",
    state: { status: "quota" },
    shows: /AI credits exhausted/i,
    offersRetry: false,
  },
  {
    boundary: "queueing",
    state: { status: "queued", message: "Too many AI requests right now." },
    shows: /AI is busy right now/i,
    offersRetry: true,
  },
  {
    boundary: "streaming",
    state: { status: "streaming", text: "the answer so f" },
    shows: /Generating/i,
    offersRetry: false,
  },
  {
    boundary: "cancellation",
    state: { status: "cancelled" },
    shows: /You stopped this request/i,
    offersRetry: true,
  },
  {
    boundary: "retry",
    state: { status: "loading", attempt: 2 },
    shows: /Retrying — attempt 2/i,
    offersRetry: false,
  },
  {
    boundary: "partial output",
    state: { status: "cancelled", text: "half an answer" },
    shows: /Stopped — partial answer kept/i,
    offersRetry: true,
  },
  {
    boundary: "citation loading",
    state: { status: "streaming", text: "grounding this" },
    shows: /Generating/i,
    labelled: /loading sources/i,
    expectsCitations: true,
    offersRetry: false,
  },
  {
    boundary: "provider failure",
    state: { status: "unavailable", message: "The AI provider is temporarily unavailable." },
    shows: /AI is temporarily unavailable/i,
    offersRetry: true,
  },
  {
    boundary: "permission revocation",
    state: { status: "denied", reason: "Missing permission: kb:ai:generate" },
    shows: /don't have access to this AI feature/i,
    offersRetry: false,
  },
];

describe("the nine AI boundary states each render a defined surface", () => {
  it.each(CASES)(
    "$boundary renders its own state",
    ({ state, shows, labelled, expectsCitations }) => {
      render(
        <AiActionResultBody
          state={state}
          onRetry={jest.fn()}
          onCancel={jest.fn()}
          expectsCitations={expectsCitations ?? false}
        />,
      );
      expect(screen.getByText(shows)).toBeInTheDocument();
      if (labelled) expect(screen.getByLabelText(labelled)).toBeInTheDocument();
    },
  );

  it.each(CASES)(
    "$boundary offers a retry only when re-dispatch can help",
    ({ state, offersRetry, expectsCitations }) => {
      render(
        <AiActionResultBody
          state={state}
          onRetry={jest.fn()}
          onCancel={jest.fn()}
          expectsCitations={expectsCitations ?? false}
        />,
      );
      const retry = screen.queryByRole("button", { name: /try again|retry|run again/i });
      expect(retry !== null).toBe(offersRetry);
    },
  );

  it("renders a distinguishable surface per status, not one grey sentence repeated", () => {
    const distinct = CASES.filter((entry) => entry.labelled === undefined);
    const rendered = distinct.map(({ state }) => {
      const view = render(
        <AiActionResultBody state={state} onRetry={jest.fn()} onCancel={jest.fn()} />,
      );
      const text = view.container.textContent ?? "";
      view.unmount();
      return text;
    });

    expect(new Set(rendered).size).toBe(8);
  });

  it("shows a citation placeholder only when the action declares sources", () => {
    render(
      <AiActionResultBody
        state={{ status: "streaming", text: "part" }}
        expectsCitations
      />,
    );
    expect(screen.getByLabelText(/loading sources/i)).toBeInTheDocument();
  });

  /**
   * The placeholder used to be unconditional, so 26 of the 28 files that define
   * an `AiAction` shimmered "Loading sources" and then resolved to nothing. A
   * promise the surface cannot keep is worse than no promise, so the default is
   * silence and the two surfaces that really do return citations opt in.
   */
  it("shows no citation placeholder when the action never returns sources", () => {
    render(<AiActionResultBody state={{ status: "streaming", text: "part" }} />);
    expect(screen.queryByLabelText(/loading sources/i)).toBeNull();
  });

  it("does not show a citation placeholder once the answer is ready", () => {
    render(
      <AiActionResultBody
        state={{ status: "ready", result: { text: "done", citations: [] } }}
      />,
    );
    expect(screen.queryByLabelText(/loading sources/i)).toBeNull();
  });

  it("offers Stop while streaming so the spend can be ended mid-answer", async () => {
    const onCancel = jest.fn();
    render(
      <AiActionResultBody
        state={{ status: "streaming", text: "half" }}
        onCancel={onCancel}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /stop/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("keeps the partial answer visible after the user stops", () => {
    render(
      <AiActionResultBody
        state={{ status: "cancelled", text: "half an answer" }}
        onRetry={jest.fn()}
      />,
    );
    expect(screen.getByText(/half an answer/)).toBeInTheDocument();
  });
});

function inlineSession(
  state: AiActionResultState,
  expectsCitations = false,
): AiInlineSession {
  return {
    actionKey: "improve",
    expectsCitations,
    state,
    apply: jest.fn(),
    reject: jest.fn(),
    retry: jest.fn(),
    cancel: jest.fn(),
  };
}

describe("the inline preview renders the same vocabulary", () => {
  it.each(CASES)(
    "$boundary renders inline too",
    ({ state, shows, expectsCitations }) => {
      render(
        <AiInlinePreview session={inlineSession(state, expectsCitations ?? false)} />,
      );
      expect(screen.getByText(shows)).toBeInTheDocument();
    },
  );

  it("carries the same citation declaration inline", () => {
    const streaming: AiActionResultState = { status: "streaming", text: "part" };
    const { unmount } = render(
      <AiInlinePreview session={inlineSession(streaming, true)} />,
    );
    expect(screen.getByLabelText(/loading sources/i)).toBeInTheDocument();
    unmount();

    render(<AiInlinePreview session={inlineSession(streaming, false)} />);
    expect(screen.queryByLabelText(/loading sources/i)).toBeNull();
  });
});
