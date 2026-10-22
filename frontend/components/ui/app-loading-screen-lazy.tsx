"use client";

import dynamic from "next/dynamic";

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
