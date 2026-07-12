"use client";

import { ReactNode, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { addDays, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { EntityFormSheet } from "@/components/shared";
import { SprintFormFields } from "./sprint-form-fields";
import { useCreateSprint } from "@/hooks/api/projects";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

const sprintNameSchema = z
  .string()
  .transform((v) => v.trim())
  .pipe(
    z
      .string()
      .min(2, "Sprint name must be at least 2 characters")
      .max(100, "Sprint name must be 100 characters or fewer")
      .regex(/[A-Za-z0-9]/, "Sprint name must contain at least one letter or number"),
  );

const createSprintSchema = z
  .object({
    name: sprintNameSchema,
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    goal: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End date must be on or after start date.",
          path: ["endDate"],
        });
      }
    }
  });

type CreateSprintInput = z.infer<typeof createSprintSchema>;

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
        <Button size="sm" onClick={handleOpen}>
          <Plus className="h-4 w-4 mr-2" />
          Create Sprint
        </Button>
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
