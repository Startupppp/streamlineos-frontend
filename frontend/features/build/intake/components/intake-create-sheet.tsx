"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useCreateIntakeRequest } from "@/hooks/api/build/intake";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  createIntakeSchema,
  type CreateIntakeForm,
} from "@/features/build/intake/intake-schema";

interface IntakeCreateSheetProps {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IntakeCreateSheet({
  projectId,
  open,
  onOpenChange,
}: IntakeCreateSheetProps) {
  const createMutation = useCreateIntakeRequest();
  const createForm = useForm<CreateIntakeForm>({
    resolver: zodResolver(createIntakeSchema),
  });
  useRegisterDirtyState(open && createForm.formState.isDirty);

  const handleSubmit = useCallback(
    (data: CreateIntakeForm) => {
      createMutation.mutate(
        { ...data, projectId },
        {
          onSuccess: () => {
            onOpenChange(false);
            createForm.reset();
            toast.success("Intake item created");
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [createMutation, projectId, createForm, onOpenChange],
  );

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button size="sm" aria-label="New Item" className="shrink-0">
          <Plus className="h-4 w-4 mr-1" /> New Item
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-md p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>Create Intake Item</SheetTitle>
          <SheetDescription>
            Capture a request so it can be reviewed and triaged into project
            work.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="px-6 py-5">
          <form
            id="create-intake-form"
            onSubmit={createForm.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="intake-title">Title</Label>
              <Input id="intake-title" {...createForm.register("title")} />
              {createForm.formState.errors.title && (
                <p className="text-xs text-destructive mt-1" aria-live="polite">
                  {createForm.formState.errors.title.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="intake-desc">Description</Label>
              <Textarea
                id="intake-desc"
                {...createForm.register("description")}
              />
            </div>
          </form>
        </SheetBody>
        <div className="shrink-0 px-6 py-4 border-t">
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <LoadingButton
              size="sm"
              type="submit"
              form="create-intake-form"
              isPending={createMutation.isPending}
              loadingText="Creating…"
            >
              Create Item
            </LoadingButton>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
