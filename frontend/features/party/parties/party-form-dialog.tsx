"use client";

import { toast } from "sonner";
import { AppDialog } from "@/components/shared/app-dialog";
import { RecordForm } from "@/features/renderer/record-form";
import { PARTY_LAYOUT } from "@/lib/renderer/party-layout";
import type { RecordFormValues } from "@/features/renderer/record-form";
import { useCreateParty, useUpdateParty } from "@/hooks/api/party/parties";
import type { BusinessParty, CreatePartyInput, UpdatePartyInput } from "@/types/party/parties";
import { getErrorMessage } from "@/lib/get-error-message";

/**
 * The create and edit form, rendered from the layout description.
 *
 * This used to be three hundred lines of hand-written fields, with its own Zod
 * schema listing the same columns the layout already describes. Two descriptions
 * of one record drift: the hand-written one had never gained `displayName` or
 * `notes`, both of which the API has always accepted.
 *
 * The layout is now the only place a party's shape is written down, so the list,
 * the detail view and this form cannot disagree about what a party is.
 */

/**
 * Empty strings mean "not provided" on create, and "clear it" on edit.
 *
 * The API distinguishes them: `undefined` means "do not change" to the update
 * DTO, so sending it would make a field impossible to clear — the same trap
 * ticket 08 hit with the deal links.
 */
function forCreate(values: RecordFormValues): CreatePartyInput {
  const optional: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (key === "name") continue;
    const trimmed = value.trim();
    if (trimmed) optional[key] = trimmed;
  }

  // `name` is stated rather than swept up with the rest: it is the one field the
  // API requires, and building it generically would leave the type unable to
  // promise it is there.
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
        // Remounted per open so the form resets to the record being edited
        // rather than keeping the last one's values.
        key={`${mode}:${defaultValues?.partyId ?? "new"}:${String(open)}`}
        layout={PARTY_LAYOUT}
        mode={mode}
        initial={defaultValues as unknown as Record<string, unknown> | undefined}
        onSubmit={handleSubmit}
        onCancel={() => onOpenChange(false)}
        isSubmitting={isPending}
        submitLabel={mode === "create" ? "Add party" : "Save changes"}
      />
    </AppDialog>
  );
}
