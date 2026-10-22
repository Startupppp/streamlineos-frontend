
export type TickerCallback = (time: number) => void;

interface Subscriber {
  callback: TickerCallback;
  getFramerate: () => number;
  last: number;
}

const subscribers = new Set<Subscriber>();
let rafId: number | null = null;

const frame = (time: number): void => {
  for (const sub of [...subscribers]) {
    if (!subscribers.has(sub)) continue;
    if (time - sub.last <= sub.getFramerate()) continue;
    sub.last = time;
    try {
      sub.callback(time);
    } catch (error) {
      console.error("[ticker] subscriber threw:", error);
    }
  }
  rafId = requestAnimationFrame(frame);
};

const start = (): void => {
  if (rafId === null) rafId = requestAnimationFrame(frame);
};

const stop = (): void => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
};

export const subscribeToTicker = (
  callback: TickerCallback,
  getFramerate: () => number,
): (() => void) => {
  const subscriber: Subscriber = {
    callback,
    getFramerate,
    last: performance.now(),
  };
  subscribers.add(subscriber);
  start();

  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) stop();
  };
};
