"use client";

import { toast } from "sonner";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RecordForm, asRecordValue, type RecordFormValues } from "@/features/renderer";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import {
  useCreateSlaPolicy,
  useUpdateSlaPolicy,
  type CreateSlaPolicyInput,
  type SlaPolicy,
  type UpdateSlaPolicyInput,
} from "@/hooks/api/crm-settings";
import { getErrorMessage } from "@/lib/get-error-message";
import { SLA_POLICY_LAYOUT } from "@/lib/renderer/crm/settings/sla-policy-layout";
import { numberOr, numberOrOmit, requiredText, textOrOmit } from "./shared/record-payload";

/**
 * Create and edit an SLA policy, rendered from the description.
 *
 * The two union fields are narrowed by looking the submitted string up in the
 * list of values the API accepts, rather than asserted into place. A value that
 * is not on the list is dropped instead of being sent, because the alternative
 * is a cast that makes a wrong value compile.
 */

const APPLIES_TO = ["lead", "deal", "both"] as const;
const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

function toAppliesTo(value: string | undefined): (typeof APPLIES_TO)[number] | undefined {
  return APPLIES_TO.find((candidate) => candidate === value);
}

function toPriority(value: string | undefined): (typeof PRIORITIES)[number] | undefined {
  return PRIORITIES.find((candidate) => candidate === value);
}

interface SlaPolicySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: SlaPolicy | null;
}

export function SlaPolicySheet({ open, onOpenChange, policy }: SlaPolicySheetProps) {
  const layout = useTenantLayout(SLA_POLICY_LAYOUT);
  const createPolicy = useCreateSlaPolicy();
  const updatePolicy = useUpdateSlaPolicy();
  const isEditing = policy !== null;
  const isPending = createPolicy.isPending || updatePolicy.isPending;

  function handleClose() {
    onOpenChange(false);
  }

  function handleSubmit(values: RecordFormValues) {
    if (policy) {
      const patch: UpdateSlaPolicyInput = { id: policy.id };
      const name = textOrOmit(values, "name");
      if (name !== undefined) patch.name = name;
      const appliesTo = toAppliesTo(values.appliesTo);
      if (appliesTo !== undefined) patch.appliesTo = appliesTo;
      const priority = toPriority(values.priority);
      if (priority !== undefined) patch.priority = priority;
      const firstResponseHours = numberOrOmit(values, "firstResponseHours");
      if (firstResponseHours !== undefined) patch.firstResponseHours = firstResponseHours;
      const resolutionHours = numberOrOmit(values, "resolutionHours");
      if (resolutionHours !== undefined) patch.resolutionHours = resolutionHours;

      updatePolicy.mutate(patch, {
        onSuccess: () => {
          toast.success("Policy updated");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
      return;
    }

    const payload: CreateSlaPolicyInput = {
      name: requiredText(values, "name"),
      appliesTo: toAppliesTo(values.appliesTo) ?? "both",
      priority: toPriority(values.priority) ?? "medium",
      firstResponseHours: numberOr(values, "firstResponseHours", 4),
      resolutionHours: numberOr(values, "resolutionHours", 24),
    };

    createPolicy.mutate(payload, {
      onSuccess: () => {
        toast.success("Policy created");
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle>{isEditing ? "Edit SLA policy" : "New SLA policy"}</SheetTitle>
          <SheetDescription>
            A policy is a promise with a clock on it — how fast the team answers, and how fast it
            finishes.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="px-6 py-5">
          <RecordForm
            key={policy?.id ?? "new"}
            layout={layout}
            mode={isEditing ? "edit" : "create"}
            initial={
              policy
                ? asRecordValue(policy)
                : {
                    appliesTo: "both",
                    priority: "medium",
                    firstResponseHours: "4",
                    resolutionHours: "24",
                  }
            }
            onSubmit={handleSubmit}
            onCancel={handleClose}
            isSubmitting={isPending}
            submitLabel={isEditing ? "Save changes" : "Create policy"}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
