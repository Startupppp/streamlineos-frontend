"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AiResultSurface } from "./ai-action-types";

interface AiResultOverlaysProps {
  title: string;
  surface: AiResultSurface | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const OVERLAY_DESCRIPTION =
  "AI-generated draft grounded in this record. Review before you use it.";

export function AiResultOverlays({
  title,
  surface,
  open,
  onOpenChange,
  children,
}: AiResultOverlaysProps) {
  return (
    <>
      <Sheet open={open && surface === "sheet"} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 border-b border-border px-6 py-4">
            <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
            <SheetDescription className="text-label text-muted-foreground">
              {OVERLAY_DESCRIPTION}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>
        </SheetContent>
      </Sheet>

      <Dialog open={open && surface === "dialog"} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[min(640px,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
            <DialogDescription className="text-label text-muted-foreground">
              {OVERLAY_DESCRIPTION}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
