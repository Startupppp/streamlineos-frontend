import { act, renderHook } from "@testing-library/react";
import { suppressAutoMarkRead } from "@/hooks/api/chat-mark-read-suppress";
import { useChatReadMarker } from "../use-chat-read-marker";

const CHANNEL_ID = 7;

interface MarkerProps {
  channelId: number;
  newestMessageId: number | undefined;
}

function mount(markRead: { mutate: jest.Mock }) {
  const initialProps: MarkerProps = {
    channelId: CHANNEL_ID,
    newestMessageId: undefined,
  };
  return renderHook(
    ({ channelId, newestMessageId }: MarkerProps) =>
      useChatReadMarker({ channelId, newestMessageId, markRead }),
    { initialProps },
  );
}

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  setVisibility("visible");
});

afterEach(() => {
  jest.useRealTimers();
});

describe("opening a channel", () => {
  it("marks it read once", () => {
    const markRead = { mutate: jest.fn() };

    mount(markRead);

    expect(markRead.mutate).toHaveBeenCalledTimes(1);
    expect(markRead.mutate).toHaveBeenCalledWith({ channelId: CHANNEL_ID });
  });

  it("does not re-mark on an unrelated re-render", () => {
    const markRead = { mutate: jest.fn() };
    const { rerender } = mount(markRead);

    rerender({ channelId: CHANNEL_ID, newestMessageId: undefined });

    expect(markRead.mutate).toHaveBeenCalledTimes(1);
  });

  it("never marks a placeholder channel id", () => {
    const markRead = { mutate: jest.fn() };

    renderHook(() =>
      useChatReadMarker({ channelId: 0, newestMessageId: undefined, markRead }),
    );

    expect(markRead.mutate).not.toHaveBeenCalled();
  });
});

describe("a channel that needs joining", () => {
  it("never marks it read, then marks once the join lifts the gate", () => {
    const markRead = { mutate: jest.fn() };
    const { rerender } = renderHook(
      ({ enabled, newestMessageId }: { enabled: boolean; newestMessageId: number | undefined }) =>
        useChatReadMarker({ channelId: CHANNEL_ID, newestMessageId, markRead, enabled }),
      { initialProps: { enabled: false, newestMessageId: undefined as number | undefined } },
    );
    rerender({ enabled: false, newestMessageId: 5 });
    act(() => {
      jest.advanceTimersByTime(5_000);
    });
    expect(markRead.mutate).not.toHaveBeenCalled();
    rerender({ enabled: true, newestMessageId: 5 });
    expect(markRead.mutate).toHaveBeenCalledTimes(1);
  });
});

describe("a message arriving while the reader is looking at the channel", () => {
  it("re-marks read after the debounce, so messages read on screen do not stay unread", () => {
    const markRead = { mutate: jest.fn() };
    const { rerender } = mount(markRead);

    rerender({ channelId: CHANNEL_ID, newestMessageId: 100 });
    markRead.mutate.mockClear();

    rerender({ channelId: CHANNEL_ID, newestMessageId: 101 });
    expect(markRead.mutate).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1_000);
    });

    expect(markRead.mutate).toHaveBeenCalledTimes(1);
  });

  it("does not re-mark while the tab is hidden, so a background tab stays unread", () => {
    const markRead = { mutate: jest.fn() };
    const { rerender } = mount(markRead);

    rerender({ channelId: CHANNEL_ID, newestMessageId: 100 });
    markRead.mutate.mockClear();
    setVisibility("hidden");

    rerender({ channelId: CHANNEL_ID, newestMessageId: 101 });
    act(() => {
      jest.advanceTimersByTime(1_000);
    });

    expect(markRead.mutate).not.toHaveBeenCalled();
  });

  it("does not re-mark for the first newest id seen, which the open-time mark already covered", () => {
    const markRead = { mutate: jest.fn() };
    const { rerender } = mount(markRead);
    markRead.mutate.mockClear();

    rerender({ channelId: CHANNEL_ID, newestMessageId: 100 });
    act(() => {
      jest.advanceTimersByTime(1_000);
    });

    expect(markRead.mutate).not.toHaveBeenCalled();
  });

  it("ignores an optimistic message, whose id is negative until the server answers", () => {
    const markRead = { mutate: jest.fn() };
    const { rerender } = mount(markRead);

    rerender({ channelId: CHANNEL_ID, newestMessageId: 100 });
    markRead.mutate.mockClear();

    rerender({ channelId: CHANNEL_ID, newestMessageId: -1 });
    act(() => {
      jest.advanceTimersByTime(1_000);
    });

    expect(markRead.mutate).not.toHaveBeenCalled();
  });
});

describe("mark as unread suppresses auto mark-read on the open channel", () => {
  it("does not mark read while suppression is active", () => {
    const markRead = { mutate: jest.fn() };
    const { rerender } = mount(markRead);
    markRead.mutate.mockClear();
    suppressAutoMarkRead(CHANNEL_ID, 5_000);
    rerender({ channelId: CHANNEL_ID, newestMessageId: 101 });
    act(() => {
      jest.advanceTimersByTime(1_000);
    });
    expect(markRead.mutate).not.toHaveBeenCalled();
  });
});

describe("switching channel", () => {
  it("marks the newly opened channel read", () => {
    const markRead = { mutate: jest.fn() };
    const { rerender } = mount(markRead);
    markRead.mutate.mockClear();

    rerender({ channelId: 9, newestMessageId: undefined });

    expect(markRead.mutate).toHaveBeenCalledWith({ channelId: 9 });
  });

  it("does not attribute the previous channel's newest message to the new one", () => {
    const markRead = { mutate: jest.fn() };
    const { rerender } = mount(markRead);

    rerender({ channelId: CHANNEL_ID, newestMessageId: 100 });
    rerender({ channelId: CHANNEL_ID, newestMessageId: 101 });
    act(() => {
      jest.advanceTimersByTime(1_000);
    });
    markRead.mutate.mockClear();

    rerender({ channelId: 9, newestMessageId: 101 });
    act(() => {
      jest.advanceTimersByTime(1_000);
    });

    expect(markRead.mutate).toHaveBeenCalledTimes(1);
    expect(markRead.mutate).toHaveBeenCalledWith({ channelId: 9 });
  });
});
