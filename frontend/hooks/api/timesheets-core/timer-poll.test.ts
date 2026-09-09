import { TIMER_POLL_MS, timerPollIntervalMs } from "./timer";

describe("timerPollIntervalMs", () => {
  it("polls fastest while a timer is running", () => {
    expect(timerPollIntervalMs("RUNNING", 0)).toBe(TIMER_POLL_MS.running);
    expect(timerPollIntervalMs("RUNNING", 10 * 60_000)).toBe(TIMER_POLL_MS.running);
  });

  it("polls a paused timer slowly — it only moves when its owner moves it", () => {
    expect(timerPollIntervalMs("PAUSED", 0)).toBe(TIMER_POLL_MS.paused);
    expect(timerPollIntervalMs("PAUSED", 10 * 60_000)).toBe(TIMER_POLL_MS.paused);
  });

  it("backs off while no timer exists", () => {
    expect(timerPollIntervalMs(null, 0)).toBe(60_000);
    expect(timerPollIntervalMs(null, 119_000)).toBe(60_000);
    expect(timerPollIntervalMs(null, 120_000)).toBe(120_000);
    expect(timerPollIntervalMs(null, 240_000)).toBe(240_000);
  });

  it("caps the backoff so a stale tab still notices a timer started elsewhere", () => {
    expect(timerPollIntervalMs(null, 600_000)).toBe(TIMER_POLL_MS.idleMax);
    expect(timerPollIntervalMs(undefined, 8 * 60 * 60_000)).toBe(TIMER_POLL_MS.idleMax);
  });

  it("never returns a shorter interval than the previous flat 120s once genuinely idle", () => {
    expect(timerPollIntervalMs(null, 10 * 60_000)).toBeGreaterThanOrEqual(120_000);
  });

  it("treats a finished timer as idle rather than as something to watch", () => {
    expect(timerPollIntervalMs("STOPPED", 0)).toBe(60_000);
    expect(timerPollIntervalMs("CONVERTED", 600_000)).toBe(TIMER_POLL_MS.idleMax);
  });
});
