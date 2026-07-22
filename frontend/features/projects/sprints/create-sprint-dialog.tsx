"use client";

import { ReactNode, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format } from "date-fns";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PlusIcon } from "@animateicons/react/lucide";
import { EntityFormSheet } from "@/components/shared";
import { SprintFormFields } from "./sprint-form-fields";
import { createSprintSchema, type CreateSprintInput } from "./sprint-schema";
import { useCreateSprint } from "@/hooks/api/projects";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

interface CreateSprintDialogProps {
  projectId: number;
  trigger?: ReactNode;
}

export function CreateSprintDialog({ projectId, trigger }: CreateSprintDialogProps) {
  const [open, setOpen] = useState(false);
  const createSprint = useCreateSprint();

  const handleOpen = () => setOpen(true);

  const handleSubmit = (data: CreateSprintInput) => {
    createSprint.mutate(
      {
        projectId,
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        goal: data.goal || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Sprint created successfully");
          setOpen(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  };

  return (
    <>
      {trigger ? (
        <span onClick={handleOpen} role="button" tabIndex={0}>
          {trigger}
        </span>
      ) : (
        <AnimatedIconButton size="sm" onClick={handleOpen} icon={PlusIcon} iconSize={16} iconClassName="mr-2">
          Create Sprint
        </AnimatedIconButton>
      )}
      <EntityFormSheet<CreateSprintInput>
        open={open}
        onOpenChange={setOpen}
        title="Create new sprint"
        resolver={zodResolver(createSprintSchema)}
        defaultValues={{
          name: "",
          startDate: format(new Date(), "yyyy-MM-dd"),
          endDate: format(addDays(new Date(), 14), "yyyy-MM-dd"),
          goal: "",
        }}
        onSubmit={handleSubmit}
        isSubmitting={createSprint.isPending}
        submitLabel="Create sprint"
      >
        {(form) => <SprintFormFields form={form} />}
      </EntityFormSheet>
    </>
  );
}
