"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommandPalette } from "@/components/command-palette";
import { useAfterLoad } from "@/hooks/common/use-after-load";

/**
 * Only the Cmd+K listener has to exist before first paint; cmdk, the global
 * search hook and the palette body are fetched the first time the palette is
 * opened, so a cold authenticated load never downloads a surface nobody has
 * asked for. `warmPalette` also runs on the modifier keydown, so the chunk is
 * normally resolved before the `k` lands.
 */
let paletteModule: Promise<typeof import("./command-palette-dialog")> | null =
  null;

function warmPalette() {
  paletteModule ??= import("./command-palette-dialog");
  return paletteModule;
}

function CommandPaletteLoading() {
  return (
    <Dialog open>
      <DialogContent
        className="max-w-2xl gap-0 overflow-hidden p-0"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="flex flex-col gap-3 p-4"
        >
          <span className="sr-only">Loading search</span>
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-7 w-full rounded-md" />
          <Skeleton className="h-7 w-4/5 rounded-md" />
          <Skeleton className="h-7 w-3/5 rounded-md" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

const CommandPaletteDialogBody = dynamic(
  () => warmPalette().then((m) => m.CommandPaletteDialogBody),
  { ssr: false, loading: CommandPaletteLoading },
);

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen } = useCommandPalette();
  const [isReady, setIsReady] = useState(false);
  const afterLoad = useAfterLoad();

  useEffect(() => {
    if (!afterLoad) return;
    void warmPalette();
  }, [afterLoad]);

  const handleWarm = useCallback(() => {
    void warmPalette();
  }, []);

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      if (e.key === "Meta" || e.key === "Control") {
        handleWarm();
        return;
      }
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen(!paletteOpen);
      }
    };
    document.addEventListener("keydown", handleDown);
    return () => document.removeEventListener("keydown", handleDown);
  }, [paletteOpen, setPaletteOpen, handleWarm]);

  useEffect(() => {
    if (!paletteOpen || isReady) return;
    let cancelled = false;
    void warmPalette().then(() => {
      if (!cancelled) setIsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [paletteOpen, isReady]);

  if (isReady) return <CommandPaletteDialogBody />;
  if (paletteOpen) return <CommandPaletteLoading />;
  return null;
}
