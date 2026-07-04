"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useDuplicateTemplate } from "@/hooks/api/payroll";
import type { TemplateRow } from "@/types/payroll/setup";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(300).optional(),
});
type DuplicateForm = z.infer<typeof schema>;

type DuplicateTemplateDialogProps = {
  template: TemplateRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (result: TemplateRow) => void;
};

export function DuplicateTemplateDialog({
  template,
  open,
  onOpenChange,
  onSuccess,
}: DuplicateTemplateDialogProps) {
  const duplicate = useDuplicateTemplate();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DuplicateForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: template ? `${template.name} (Copy)` : "", description: "" },
  });

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  }

  function onSubmit(data: DuplicateForm) {
    if (!template) return;
    duplicate.mutate(
      { templateId: template.id, name: data.name, description: data.description },
      {
        onSuccess: (result) => {
          toast.success("Template duplicated");
          handleOpenChange(false);
          onSuccess?.(result);
        },
        onError: () => toast.error("Failed to duplicate template"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicate Template</DialogTitle>
          <DialogDescription className="text-xs">
            Creates a private copy you can customise for this organisation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="dup-name" className="text-xs font-medium">Name *</Label>
            <Input id="dup-name" {...register("name")} className="h-8 text-sm" />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="dup-desc" className="text-xs font-medium">Description</Label>
            <Input id="dup-desc" {...register("description")} className="h-8 text-sm" />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={duplicate.isPending}>
              {duplicate.isPending ? "Duplicating…" : "Duplicate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
