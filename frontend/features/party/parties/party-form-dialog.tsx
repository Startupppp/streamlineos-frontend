"use client";

import { toast } from "sonner";
import { AppDialog } from "@/components/shared/app-dialog";
import { RecordForm } from "@/components/renderer/record-form";
import { PARTY_LAYOUT } from "@/lib/renderer/party-layout";
import type { RecordFormValues } from "@/components/renderer/record-form";
import { asRecordValue } from "@/components/renderer/format-value";
import { useCreateParty, useUpdateParty } from "@/hooks/api/party/parties";
import type { BusinessParty, CreatePartyInput, UpdatePartyInput } from "@/types/party/parties";
import { getErrorMessage } from "@/lib/get-error-message";

function forCreate(values: RecordFormValues): CreatePartyInput {
  const optional: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (key === "name") continue;
    const trimmed = value.trim();
    if (trimmed) optional[key] = trimmed;
  }

  return { ...optional, name: values.name?.trim() ?? "" } as CreatePartyInput;
}

function forUpdate(values: RecordFormValues): Omit<UpdatePartyInput, "partyId"> {
  const payload: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(values)) {
    if (key === "name") continue;
    const trimmed = value.trim();
    payload[key] = trimmed ? trimmed : null;
  }

  return { ...payload, name: values.name?.trim() } as Omit<UpdatePartyInput, "partyId">;
}

interface CreateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create";
  defaultValues?: undefined;
}

interface EditProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "edit";
  defaultValues: BusinessParty;
}

type Props = CreateProps | EditProps;

export function PartyFormDialog({ open, onOpenChange, mode, defaultValues }: Props) {
  const createParty = useCreateParty();
  const updateParty = useUpdateParty();

  const isPending = mode === "create" ? createParty.isPending : updateParty.isPending;

  function handleSubmit(values: RecordFormValues) {
    if (mode === "create") {
      createParty.mutate(forCreate(values), {
        onSuccess: () => {
          toast.success("Party added");
          onOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
      return;
    }

    if (!defaultValues) return;

    updateParty.mutate(
      { ...forUpdate(values), partyId: defaultValues.partyId },
      {
        onSuccess: () => {
          toast.success("Party updated");
          onOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? "Add a party" : "Edit party"}
    >
      <RecordForm
        key={`${mode}:${defaultValues?.partyId ?? "new"}:${String(open)}`}
        layout={PARTY_LAYOUT}
        mode={mode}
        initial={defaultValues !== undefined ? asRecordValue(defaultValues) : undefined}
        onSubmit={handleSubmit}
        onCancel={() => onOpenChange(false)}
        isSubmitting={isPending}
        submitLabel={mode === "create" ? "Add party" : "Save changes"}
      />
    </AppDialog>
  );
}
