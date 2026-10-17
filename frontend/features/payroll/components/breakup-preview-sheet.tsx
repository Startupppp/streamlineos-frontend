"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SampleCtcPreview } from "@/features/payroll/salary-structures/salary-breakup-preview";

export function BreakupPreviewSheet() {
  const [open, setOpen] = useState(false);

  function handleOpen() {
    setOpen(true);
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={handleOpen}>
        Preview breakup
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="p-0 flex flex-col gap-0 overflow-hidden sm:max-w-md">
          <div className="shrink-0 px-6 py-4 border-b">
            <SheetHeader>
              <SheetTitle className="text-base">Salary breakup preview</SheetTitle>
              <SheetDescription className="text-xs">
                What the active components pay for a sample CTC, computed by the payroll engine.
              </SheetDescription>
            </SheetHeader>
          </div>
          <SheetBody className="px-6 py-4">
            {open ? <SampleCtcPreview /> : null}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}
