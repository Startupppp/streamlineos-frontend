import { renderHook } from "@testing-library/react";
import { useHuddleAutoStart } from "./use-huddle-auto-start";

interface Overrides {
  activeHuddle?: { id: number } | null;
  isInHuddle?: boolean;
  joinHuddleRequested?: boolean;
  huddleSettled?: boolean;
}

function setup(overrides: Overrides = {}) {
  const joinHuddle = { mutate: jest.fn() };
  const startHuddle = { mutate: jest.fn() };
  const onJoinHuddleHandled = jest.fn();
  const props = {
    channelId: 5,
    autoStartCall: null,
    onAutoStartHandled: undefined,
    activeHuddle: { id: 9 },
    isInHuddle: false,
    startHuddle,
    joinHuddle,
    joinHuddleRequested: true,
    huddleSettled: true,
    onJoinHuddleHandled,
    ...overrides,
  };
  const view = renderHook((p) => useHuddleAutoStart(p), { initialProps: props });
  return { view, props, joinHuddle, onJoinHuddleHandled };
}

describe("useHuddleAutoStart joinHuddle param", () => {
  it("joins the active huddle and consumes the param once", () => {
    const { view, props, joinHuddle, onJoinHuddleHandled } = setup();
    expect(joinHuddle.mutate).toHaveBeenCalledWith({ huddleId: 9, channelId: 5 });
    expect(onJoinHuddleHandled).toHaveBeenCalledTimes(1);
    view.rerender({ ...props, joinHuddleRequested: false });
    expect(joinHuddle.mutate).toHaveBeenCalledTimes(1);
    expect(onJoinHuddleHandled).toHaveBeenCalledTimes(1);
  });

  it("consumes the param without joining when already in the huddle", () => {
    const { joinHuddle, onJoinHuddleHandled } = setup({ isInHuddle: true });
    expect(joinHuddle.mutate).not.toHaveBeenCalled();
    expect(onJoinHuddleHandled).toHaveBeenCalledTimes(1);
  });

  it("consumes the param without joining when no huddle is active", () => {
    const { joinHuddle, onJoinHuddleHandled } = setup({ activeHuddle: null });
    expect(joinHuddle.mutate).not.toHaveBeenCalled();
    expect(onJoinHuddleHandled).toHaveBeenCalledTimes(1);
  });

  it("waits for the huddle read before deciding", () => {
    const { view, props, joinHuddle, onJoinHuddleHandled } = setup({
      activeHuddle: undefined,
      huddleSettled: false,
    });
    expect(joinHuddle.mutate).not.toHaveBeenCalled();
    expect(onJoinHuddleHandled).not.toHaveBeenCalled();
    view.rerender({ ...props, activeHuddle: { id: 9 }, huddleSettled: true });
    expect(joinHuddle.mutate).toHaveBeenCalledTimes(1);
    expect(onJoinHuddleHandled).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the param is absent", () => {
    const { joinHuddle, onJoinHuddleHandled } = setup({ joinHuddleRequested: false });
    expect(joinHuddle.mutate).not.toHaveBeenCalled();
    expect(onJoinHuddleHandled).not.toHaveBeenCalled();
  });
});
