"use client";

import { createPortal } from "react-dom";
import { useHydrated } from "@/hooks/common/use-hydrated";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAskOs } from "./ask-os-context";
import { AskOsLauncher } from "./ask-os-launcher";

export function AskOsLoading() {
  const hydrated = useHydrated();
  const { open, setOpen } = useAskOs();
  function handleClose() { setOpen(false); }
  if (!hydrated) return null;
  return createPortal(
    <div role="complementary" aria-label="Ask OS assistant" className={open
      ? "fixed inset-0 z-[60] flex flex-col md:inset-auto md:right-0 md:bottom-[env(safe-area-inset-bottom,0px)] md:z-50 md:w-[min(100vw,400px)]"
      : "fixed right-0 bottom-[env(safe-area-inset-bottom,0px)] z-50 hidden w-[min(100vw,130px)] flex-col md:flex"}>
      {open && (
        <div role="status" aria-live="polite" aria-busy="true" className="flex min-h-0 flex-1 flex-col gap-3 border-border bg-card p-4 md:h-[min(70dvh,560px)] md:flex-none md:rounded-tl-2xl md:border">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm">Loading Ask OS…</span>
            <Button variant="ghost" onClick={handleClose}>Close</Button>
          </div>
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-5 w-3/5" />
          <Skeleton className="mt-auto h-9 w-full" />
        </div>
      )}
      <AskOsLauncher />
    </div>,
    document.body,
  );
}
