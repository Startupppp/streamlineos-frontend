"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormDialog } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateMySupportRequest } from "@/hooks/api/employee-self-service/support";
import { SUPPORT_QUEUE_LABELS } from "@/lib/employee-support";
import { createRequestSchema, type CreateRequestInput } from "./create-request-schema";
import { CreateRequestFormFields } from "./create-request-form-fields";

interface CreateRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_VALUES: CreateRequestInput = {
  title: "",
  category: "other",
  priority: "MEDIUM",
  description: "",
  isConfidential: false,
};

export function CreateRequestDialog({ open, onOpenChange }: CreateRequestDialogProps) {
  const createRequest = useCreateMySupportRequest();

  const handleSubmit = (data: CreateRequestInput) => {
    createRequest.mutate(
      {
        title: data.title,
        category: data.category,
        priority: data.priority,
        description: data.description === "" ? undefined : data.description,
        isConfidential: data.isConfidential,
      },
      {
        onSuccess: (created) => {
          toast.success(`Request sent to the ${SUPPORT_QUEUE_LABELS[created.queue]} queue`);
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  };

  return (
    <EntityFormDialog<CreateRequestInput>
      open={open}
      onOpenChange={onOpenChange}
      title="Create request"
      description="Your request is routed to the right team by category."
      resolver={zodResolver(createRequestSchema)}
      defaultValues={DEFAULT_VALUES}
      onSubmit={handleSubmit}
      isSubmitting={createRequest.isPending}
      submitLabel="Create request"
      resetOnOpen
    >
      {(form) => <CreateRequestFormFields form={form} />}
    </EntityFormDialog>
  );
}
