"use client";

import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";

interface HierarchyFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  formId: string;
  isPending: boolean;
  children: ReactNode;
}

export function HierarchyFormSheet({
  open,
  onOpenChange,
  title,
  formId,
  isPending,
  children,
}: HierarchyFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-md">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <SheetBody className="px-6 py-5">{children}</SheetBody>
        <div className="shrink-0 px-6 py-4 border-t">
          <div className="grid grid-cols-2 gap-2">
            <SheetClose asChild>
              <Button variant="outline" size="sm" className="w-full">
                Cancel
              </Button>
            </SheetClose>
            <LoadingButton
              size="sm"
              type="submit"
              form={formId}
              isPending={isPending}
              loadingText="Saving…"
              className="w-full"
            >
              Save
            </LoadingButton>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
