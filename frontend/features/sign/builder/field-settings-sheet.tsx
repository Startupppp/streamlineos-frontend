"use client";

import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSignEnvelope } from "@/hooks/api/sign/envelopes";
import { useBuilder } from "./builder-context";
import { FieldSettingsPanel } from "./field-settings-panel";

interface FieldSettingsSheetProps {
  envelopeId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FieldSettingsSheet({
  envelopeId,
  open,
  onOpenChange,
}: FieldSettingsSheetProps) {
  const { selectedFieldId } = useBuilder();
  const { data } = useSignEnvelope(envelopeId);
  const field = data?.fields.find((item) => item.id === selectedFieldId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="shrink-0 border-b px-4 py-4">
          <SheetTitle>Field settings</SheetTitle>
        </SheetHeader>
        <SheetBody className="px-4 py-4">
          {field ? (
            <FieldSettingsPanel
              key={field.id}
              envelopeId={envelopeId}
              field={field}
            />
          ) : (
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">No field selected</p>
              <p>
                Click a field on the document to edit its settings, or place a
                new one from the Fields tab.
              </p>
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
