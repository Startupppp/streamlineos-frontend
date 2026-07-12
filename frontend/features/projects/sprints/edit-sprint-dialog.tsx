"use client";

import { ReactNode, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { EntityFormSheet } from "@/components/shared";
import { SprintFormFields } from "./sprint-form-fields";
import { useUpdateSprint } from "@/hooks/api/projects";
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

const editSprintSchema = z
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

type EditSprintInput = z.infer<typeof editSprintSchema>;

interface EditSprintDialogProps {
  sprint: {
    id: number;
    name: string;
    startDate: Date | string;
    endDate: Date | string;
    goal?: string | null;
  };
  projectId: number;
  trigger?: ReactNode;
}

export function EditSprintDialog({ sprint, projectId, trigger }: EditSprintDialogProps) {
  const [open, setOpen] = useState(false);
  const updateSprint = useUpdateSprint(projectId);

  const handleOpen = () => setOpen(true);

  const handleSubmit = (data: EditSprintInput) => {
    updateSprint.mutate(
      {
        sprintId: sprint.id,
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        goal: data.goal || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Sprint updated");
          setOpen(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  };

  const defaultValues: EditSprintInput = {
    name: sprint.name,
    startDate: format(new Date(sprint.startDate), "yyyy-MM-dd"),
    endDate: format(new Date(sprint.endDate), "yyyy-MM-dd"),
    goal: sprint.goal ?? "",
  };

  return (
    <>
      {trigger ? (
        <span onClick={handleOpen} role="button" tabIndex={0}>
          {trigger}
        </span>
      ) : (
        <Button variant="ghost" size="sm" onClick={handleOpen}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
      )}
      <EntityFormSheet<EditSprintInput>
        open={open}
        onOpenChange={setOpen}
        title="Edit sprint"
        resolver={zodResolver(editSprintSchema)}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isSubmitting={updateSprint.isPending}
        resetOnOpen
        submitLabel="Save changes"
      >
        {(form) => (
          <SprintFormFields
            form={form}
            goalPlaceholder="What do you want to achieve?"
          />
        )}
      </EntityFormSheet>
    </>
  );
}
