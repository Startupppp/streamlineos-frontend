"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Label } from "@/components/ui/label";
import { UserCombobox } from "@/components/ui/user-combobox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePicker } from "@/components/ui/date-picker";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateInvoiceCollection } from "@/hooks/api/accounting/ar";
import type { TopRiskCustomer } from "@/types/accounting/ar";
import { useCan } from "@/hooks/api/access";

interface CollectionOwnerPopoverProps {
  clientId: number;
  currentOwner: string | null;
  invoiceId: number | null;
}

export function CollectionOwnerPopover({
  currentOwner,
  invoiceId,
}: CollectionOwnerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentOwner ?? "");
  const mutation = useUpdateInvoiceCollection();
  const canManage = useCan("accounting:collections:manage");

  function handleAssign(): void {
    if (!invoiceId) return;
    mutation.mutate(
      { invoiceId, collectionOwnerId: value || undefined },
      {
        onSuccess: () => {
          toast.success("Owner assigned");
          setOpen(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  if (!canManage) {
    return (
      <span className="text-xs text-muted-foreground">{currentOwner ?? "—"}</span>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-xs text-left hover:underline text-muted-foreground max-w-[100px] truncate"
        >
          {currentOwner ?? "Assign…"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="p-3 space-y-2">
          <Label className="text-xs">Collection owner</Label>
          <UserCombobox
            value={value}
            onChange={setValue}
            placeholder="Search for owner…"
            className="text-xs"
          />
          <LoadingButton
            size="sm"
            className="w-full text-xs"
            isPending={mutation.isPending}
            onClick={handleAssign}
            loadingText="Saving…"
          >
            Assign
          </LoadingButton>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface PromiseDatePopoverProps {
  invoiceId: number | null;
  currentDate: string | null;
}

export function PromiseDatePopover({ invoiceId, currentDate }: PromiseDatePopoverProps) {
  const [open, setOpen] = useState(false);
  const mutation = useUpdateInvoiceCollection();
  const canManage = useCan("accounting:collections:manage");

  function handleDateChange(value: string): void {
    if (!invoiceId) return;
    mutation.mutate(
      { invoiceId, promiseToPayDate: value },
      {
        onSuccess: () => {
          toast.success("Promise date set");
          setOpen(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  if (!canManage) {
    return (
      <span className="text-xs text-muted-foreground">
        {currentDate ? new Date(currentDate).toLocaleDateString() : "—"}
      </span>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-xs hover:underline text-muted-foreground"
        >
          {currentDate ? new Date(currentDate).toLocaleDateString() : "Set date…"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <DatePicker
          value={currentDate ?? undefined}
          onChange={handleDateChange}
          className="text-sm"
        />
      </PopoverContent>
    </Popover>
  );
}

interface ActivitySheetTriggerProps {
  row: TopRiskCustomer;
  onOpen: (customer: TopRiskCustomer, name: string) => void;
}

export function ActivitySheetTrigger({ row, onOpen }: ActivitySheetTriggerProps) {
  function handleClick(): void {
    onOpen(row, `Customer #${row.clientId}`);
  }

  return (
    <Button variant="ghost" size="sm" className="text-xs" onClick={handleClick}>
      + Activity
    </Button>
  );
}
