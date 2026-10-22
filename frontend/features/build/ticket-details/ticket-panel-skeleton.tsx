"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function TicketPanelSkeleton({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const close = onClose ?? (() => router.back());

  return (
    <Sheet open onOpenChange={(open) => { if (!open) close(); }}>
      <SheetContent
        aria-describedby={undefined}
        side="right"
        className="flex w-full max-w-xl flex-col p-0 sm:max-w-xl"
      >
        <SheetHeader className="flex flex-row items-center gap-2 border-b px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={close}
            aria-label="Close ticket pane"
          >
            <X className="h-4 w-4" />
          </Button>
          <SheetTitle className="line-clamp-1 text-sm font-medium">Ticket</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-5 w-3/4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
