"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface HierarchyEntityFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  formId: string;
  isPending: boolean;
  children: ReactNode;
}

export function HierarchyEntityFormSheet({
  open,
  onOpenChange,
  title,
  formId,
  isPending,
  children,
}: HierarchyEntityFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="shrink-0 gap-1 border-b px-6 py-4 text-left">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <SheetBody className="px-6 py-5">{children}</SheetBody>
        <div className="shrink-0 border-t px-6 py-4">
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
