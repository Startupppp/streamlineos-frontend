"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import {
  useCreateManagedProductRelease,
  useUpdateManagedProductRelease,
} from "@/hooks/api/build/managed-product-releases";
import type { ManagedProductRelease } from "@/hooks/api/build/managed-product-releases";
import { isWriteConflict } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

const releaseFormSchema = z.object({
  name: z.string().min(1, "Required").max(255),
  version: z.string().min(1, "Required").max(50),
  description: z.string().max(2000).optional(),
  releaseDate: z.string().optional(),
  status: z.enum(["draft", "released", "archived"]),
});
type ReleaseFormValues = z.infer<typeof releaseFormSchema>;

interface ProductReleaseFormSheetProps {
  managedProductId: number;
  editTarget?: ManagedProductRelease;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FORM_ID = "product-release-form";

function toFormValues(r: ManagedProductRelease): ReleaseFormValues {
  return {
    name: r.name,
    version: r.version,
    description: r.description ?? "",
    releaseDate: r.releaseDate ?? "",
    status: r.status,
  };
}

export function ProductReleaseFormSheet({
  managedProductId,
  editTarget,
  open,
  onOpenChange,
}: ProductReleaseFormSheetProps) {
  const isEdit = !!editTarget;
  const createRelease = useCreateManagedProductRelease(managedProductId);
  const updateRelease = useUpdateManagedProductRelease(managedProductId);
  const isPending = isEdit ? updateRelease.isPending : createRelease.isPending;

  const form = useForm<ReleaseFormValues>({
    resolver: zodResolver(releaseFormSchema),
    defaultValues: editTarget
      ? toFormValues(editTarget)
      : { name: "", version: "", description: "", releaseDate: "", status: "draft" },
    values: editTarget ? toFormValues(editTarget) : undefined,
  });

  useRegisterDirtyState(form.formState.isDirty && open);

  function handleOpenChange(next: boolean) {
    if (!next && isPending) return;
    if (!next) form.reset();
    onOpenChange(next);
  }

  const handleSubmit = useCallback(
    (values: ReleaseFormValues) => {
      if (isPending) return;
      const data = {
        name: values.name,
        version: values.version,
        description: values.description || null,
        releaseDate: values.releaseDate || null,
        status: values.status,
      };
      const onSuccess = () => {
        toast.success(isEdit ? "Release updated." : "Release created.");
        form.reset();
        onOpenChange(false);
      };
      const onError = (e: unknown) => {
        if (isWriteConflict(e)) {
          toast.error("This release was updated by someone else. Please reload and retry.");
        } else {
          toast.error(getErrorMessage(e));
        }
      };
      if (isEdit && editTarget) {
        updateRelease.mutate({ releaseId: editTarget.id, ...data }, { onSuccess, onError });
      } else {
        createRelease.mutate(data, { onSuccess, onError });
      }
    },
    [isPending, isEdit, editTarget, createRelease, updateRelease, form, onOpenChange],
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="p-0 flex flex-col gap-0 sm:max-w-md">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle>{isEdit ? "Edit release" : "New release"}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Form {...form}>
            <form
              id={FORM_ID}
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
              noValidate
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Release name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Version</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. 1.0.0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="releaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Release date (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="released">Released</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value ?? ""} rows={3} placeholder="What's in this release…" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <SheetFooter className="px-6 py-4 border-t border-border flex flex-row justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            form={FORM_ID}
            size="sm"
            isPending={isPending}
            loadingText={isEdit ? "Saving…" : "Creating…"}
          >
            {isEdit ? "Save changes" : "Create release"}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
