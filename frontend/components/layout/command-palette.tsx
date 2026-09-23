"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommandPalette } from "@/components/command-palette";

let paletteModule: Promise<typeof import("./command-palette-dialog")> | null =
  null;

function warmPalette() {
  paletteModule ??= import("./command-palette-dialog");
  return paletteModule;
}

function CommandPaletteLoadingBody() {
  return (
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
  );
}

const CommandPaletteDialogBody = dynamic(
  () => warmPalette().then((m) => m.CommandPaletteDialogBody),
  { ssr: false },
);

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen } = useCommandPalette();
  const [isReady, setIsReady] = useState(false);
  const [bodyReady, setBodyReady] = useState(false);

  useEffect(() => {
    if (!paletteOpen || bodyReady) return;
    const id = requestAnimationFrame(() => setBodyReady(true));
    return () => cancelAnimationFrame(id);
  }, [paletteOpen, bodyReady]);

  useEffect(() => {
    if (!bodyReady || isReady) return;
    let cancelled = false;
    void warmPalette().then(() => {
      if (!cancelled) setIsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [bodyReady, isReady]);

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

  if (isReady) return <CommandPaletteDialogBody />;

  if (!paletteOpen) return null;

  return (
    <Dialog open onOpenChange={() => setPaletteOpen(false)}>
      <DialogContent
        className="max-w-2xl gap-0 overflow-hidden p-0"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription className="sr-only">
          The search palette is still loading. A search box and its results will
          replace this placeholder in a moment.
        </DialogDescription>
        {bodyReady && <CommandPaletteLoadingBody />}
      </DialogContent>
    </Dialog>
  );
}
