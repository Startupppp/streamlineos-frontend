"use client";

import dynamic from "next/dynamic";

/**
 * The branded loading screen, fetched only when something actually waits.
 *
 * `app-loading-screen` is a Framer Motion composition — five animated layers and
 * the stalled-state card behind them — and the authenticated shell imported it
 * eagerly, so every route paid for it in first load. The shell prefetches
 * `/me/access` on the server and hydrates it, so on a normal load the screen it
 * pays for is never rendered at all.
 *
 * The fallback below keeps the status contract (`role`, `aria-live`,
 * `aria-busy`, the accessible label) intact for the frames before the chunk
 * lands, so a screen reader is told the same thing either way.
 */
function AppLoadingFallback() {
  return (
    <div
      className="relative flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-5"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading</span>
    </div>
  );
}

export const LazyAppLoadingScreen = dynamic(
  () =>
    import("@/components/ui/app-loading-screen").then((m) => ({
      default: m.AppLoadingScreen,
    })),
  { ssr: false, loading: AppLoadingFallback },
);
