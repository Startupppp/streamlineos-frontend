import { act, renderHook } from "@testing-library/react";

import { usePageAutosave, type PageAutosavePatch } from "./use-page-autosave";
import { ApiError } from "@/lib/api-envelope";

/**
 * Three ways the wiki editor silently discarded edits. Each is asserted against
 * what actually reached the save call, not against what the screen showed —
 * `localTitle` kept rendering the dropped rename from local draft state, which
 * is exactly why nobody noticed until a reload.
 */

type SavePayload = PageAutosavePatch & {
  pageId: number;
  expectedContentRevision: number;
};

function harness(over: { failWith?: unknown; contentRevision?: number; pageId?: number } = {}) {
  const sent: SavePayload[] = [];
  let revision = 4;
  const save = jest.fn(async (payload: SavePayload) => {
    sent.push(payload);
    if (over.failWith) throw over.failWith;
    revision += 1;
    return { contentRevision: revision };
  });
  const onConflict = jest.fn();
  const onSaveError = jest.fn();
  const hook = renderHook(
    ({ pageId, contentRevision }: { pageId: number; contentRevision?: number }) =>
      usePageAutosave({
        pageId,
        contentRevision,
        save,
        onConflict,
        onSaveError,
        delayMs: 1500,
      }),
    {
      initialProps: {
        pageId: over.pageId ?? 12,
        contentRevision: "contentRevision" in over ? over.contentRevision : 4,
      },
    },
  );
  return { hook, sent, save, onConflict, onSaveError };
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

async function settle() {
  await act(async () => {
    jest.advanceTimersByTime(1500);
  });
}

/** Lets an already-dispatched save promise resolve inside act(). */
async function drain() {
  await act(async () => {});
}

describe("wiki autosave — merging successive patches", () => {
  it("keeps the rename when the body is typed inside the debounce window", async () => {
    const { hook, sent } = harness();

    act(() => {
      hook.result.current.schedule({ title: "Onboarding checklist" });
    });
    act(() => {
      jest.advanceTimersByTime(400);
    });
    act(() => {
      hook.result.current.schedule({ content: [{ text: "step one" }], contentText: "step one" });
    });
    await settle();

    expect(sent).toHaveLength(1);
    expect(sent[0]!.title).toBe("Onboarding checklist");
    expect(sent[0]!.contentText).toBe("step one");
  });

  it("lets the newer value of the same field win", async () => {
    const { hook, sent } = harness();

    act(() => {
      hook.result.current.schedule({ title: "Draft" });
    });
    act(() => {
      hook.result.current.schedule({ title: "Onboarding checklist" });
    });
    await settle();

    expect(sent).toHaveLength(1);
    expect(sent[0]!.title).toBe("Onboarding checklist");
  });

  it("sends the expected revision when one is known", async () => {
    const { hook, sent } = harness({ contentRevision: 9 });

    act(() => {
      hook.result.current.schedule({ contentText: "x" });
    });
    await settle();

    expect(sent[0]!.expectedContentRevision).toBe(9);
  });

  it("never carries one page's revision onto another page's save", async () => {
    const { hook, sent } = harness({ contentRevision: 9 });

    act(() => {
      hook.result.current.schedule({ contentText: "typed on 12" });
    });
    act(() => {
      // Page 13 is opened; its own revision has not arrived yet (`page` is still
      // loading). Sending 12's would be a made-up precondition.
      hook.rerender({ pageId: 13, contentRevision: undefined });
    });
    act(() => {
      hook.result.current.schedule({ contentText: "typed on 13" });
    });
    act(() => {
      hook.unmount();
    });
    await drain();

    expect(sent).toHaveLength(1);
    expect(sent[0]!.pageId).toBe(12);
    expect(sent[0]!.expectedContentRevision).toBe(9);
  });

  it("holds an edit typed before the revision arrives, then sends it under that revision", async () => {
    const { hook, sent } = harness({ contentRevision: undefined });

    act(() => {
      hook.result.current.schedule({ contentText: "typed while loading" });
    });
    await settle();

    expect(sent).toHaveLength(0);

    await act(async () => {
      hook.rerender({ pageId: 12, contentRevision: 7 });
    });
    await drain();

    expect(sent).toHaveLength(1);
    expect(sent[0]!.contentText).toBe("typed while loading");
    expect(sent[0]!.expectedContentRevision).toBe(7);
  });

  it("BITE: no save is ever dispatched without a precondition", async () => {
    const { hook, sent } = harness({ contentRevision: undefined });

    act(() => {
      hook.result.current.schedule({ title: "no revision yet" });
    });
    await settle();
    act(() => {
      hook.unmount();
    });
    await drain();

    expect(sent.every((p) => typeof p.expectedContentRevision === "number")).toBe(true);
  });
});

describe("wiki autosave — flushing before the editor goes away", () => {
  it("sends pending work when the tab is hidden", async () => {
    const { hook, sent } = harness();

    act(() => {
      hook.result.current.schedule({ contentText: "two paragraphs" });
    });
    expect(sent).toHaveLength(0);

    act(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await drain();

    expect(sent).toHaveLength(1);
    expect(sent[0]!.contentText).toBe("two paragraphs");
  });

  it("sends pending work on pagehide", async () => {
    const { hook, sent } = harness();

    act(() => {
      hook.result.current.schedule({ contentText: "closing the tab" });
    });
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    await drain();

    expect(sent).toHaveLength(1);
    expect(sent[0]!.contentText).toBe("closing the tab");
  });

  it("sends pending work on unmount instead of clearing the timer", async () => {
    const { hook, sent } = harness();

    act(() => {
      hook.result.current.schedule({ contentText: "navigated away mid-sentence" });
    });
    act(() => {
      hook.unmount();
    });
    await drain();

    expect(sent).toHaveLength(1);
    expect(sent[0]!.contentText).toBe("navigated away mid-sentence");
  });

  it("sends pending work for the page being LEFT when the editor switches pages", async () => {
    const { hook, sent } = harness();

    act(() => {
      hook.result.current.schedule({ contentText: "typed on page 12" });
    });
    act(() => {
      hook.rerender({ pageId: 13, contentRevision: undefined });
    });
    await drain();

    expect(sent).toHaveLength(1);
    // Addressed to the page it was typed on, not to the one just opened.
    expect(sent[0]!.pageId).toBe(12);
    expect(sent[0]!.contentText).toBe("typed on page 12");
  });

  it("does not re-send a patch the timer already drained", async () => {
    const { hook, sent } = harness();

    act(() => {
      hook.result.current.schedule({ contentText: "saved normally" });
    });
    await settle();
    act(() => {
      hook.unmount();
    });

    expect(sent).toHaveLength(1);
  });
});

describe("wiki autosave — a 409 must not be silent", () => {
  it("raises a standing conflict flag the surface can render", async () => {
    const { hook, onConflict } = harness({
      failWith: new ApiError("Page edited by someone else", 409),
    });

    act(() => {
      hook.result.current.schedule({ title: "mine" });
    });
    await settle();

    expect(onConflict).toHaveBeenCalledTimes(1);
    expect(hook.result.current.conflict).toBe(true);
  });

  it("clears the flag only when the conflict is resolved", async () => {
    const { hook } = harness({ failWith: new ApiError("conflict", 409) });

    act(() => {
      hook.result.current.schedule({ title: "mine" });
    });
    await settle();
    expect(hook.result.current.conflict).toBe(true);

    act(() => {
      hook.result.current.resolveConflict();
    });
    expect(hook.result.current.conflict).toBe(false);
  });

  it("reports an ordinary failure without latching the editor shut", async () => {
    const { hook, onConflict, onSaveError } = harness({
      failWith: new ApiError("Internal server error", 500),
    });

    act(() => {
      hook.result.current.schedule({ title: "mine" });
    });
    await settle();

    expect(onSaveError).toHaveBeenCalledTimes(1);
    expect(onConflict).not.toHaveBeenCalled();
    expect(hook.result.current.conflict).toBe(false);
  });

  it("does not drop the patch a failed save was carrying", async () => {
    const { hook, sent } = harness({
      failWith: new ApiError("Internal server error", 500),
    });

    act(() => {
      hook.result.current.schedule({ title: "renamed" });
    });
    await settle();
    expect(sent).toHaveLength(1);

    act(() => {
      hook.result.current.schedule({ contentText: "and typed more" });
    });
    await settle();

    expect(sent).toHaveLength(2);
    expect(sent[1]!.title).toBe("renamed");
    expect(sent[1]!.contentText).toBe("and typed more");
  });
});
