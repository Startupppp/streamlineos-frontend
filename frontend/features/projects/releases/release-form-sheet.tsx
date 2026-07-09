"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import {
  useCreateRelease,
  useUpdateRelease,
  type Release,
} from "@/hooks/api/projects/releases";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  version: z.string().min(1, "Version is required"),
  description: z.string().nullable().optional(),
  status: z.enum(["draft", "released", "archived"]),
  releaseDate: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ReleaseFormSheetProps {
  projectId: number;
  release?: Release;
  onClose: () => void;
}

export function ReleaseFormSheet({ projectId, release, onClose }: ReleaseFormSheetProps) {
  const isEdit = !!release;
  const create = useCreateRelease(projectId);
  const update = useUpdateRelease(projectId);
  const isPending = create.isPending || update.isPending;

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: release?.name ?? "",
      version: release?.version ?? "",
      description: release?.description ?? null,
      status: release?.status ?? "draft",
      releaseDate: release?.releaseDate ?? null,
    },
  });

  const descriptionValue = watch("description");
  const statusValue = watch("status");
  const releaseDateValue = watch("releaseDate");

  const handleReleaseDateChange = useCallback(
    (val: string) => setValue("releaseDate", val || null),
    [setValue],
  );

  const handleDescriptionChange = useCallback(
    (html: string) => setValue("description", html || null, { shouldValidate: false }),
    [setValue],
  );

  const handleStatusChange = useCallback(
    (val: string) => {
      if (val === "draft" || val === "released" || val === "archived") {
        setValue("status", val);
      }
    },
    [setValue],
  );

  const onSubmit = useCallback(
    (values: FormValues) => {
      if (isEdit) {
        update.mutate(
          {
            releaseId: release.id,
            name: values.name,
            version: values.version,
            description: values.description || null,
            status: values.status,
            releaseDate: values.releaseDate || null,
          },
          {
            onSuccess: () => { toast.success("Release updated"); onClose(); },
            onError: () => toast.error("Failed to update release"),
          },
        );
      } else {
        create.mutate(
          {
            name: values.name,
            version: values.version,
            description: values.description || null,
            status: values.status,
            releaseDate: values.releaseDate || null,
          },
          {
            onSuccess: () => { toast.success("Release created"); onClose(); },
            onError: () => toast.error("Failed to create release"),
          },
        );
      }
    },
    [isEdit, release, create, update, onClose],
  );

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{isEdit ? "Edit Release" : "New Release"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-y-auto">
          <div className="flex-1 px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input {...register("name")} placeholder="e.g. Q3 Release" />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Version *</Label>
                <Input {...register("version")} placeholder="e.g. 1.4.0" />
                {errors.version && (
                  <p className="text-xs text-destructive">{errors.version.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={statusValue} onValueChange={handleStatusChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="released">Released</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Release Date</Label>
                <DatePicker
                  value={releaseDateValue ?? ""}
                  onChange={handleReleaseDateChange}
                  placeholder="Pick a date"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Release Notes</Label>
              <div className="rounded-md border border-input min-h-[140px]">
                <TiptapEditor
                  content={descriptionValue ?? ""}
                  onChangeHtml={handleDescriptionChange}
                  placeholder="Describe what's in this release…"
                  menuMode="static"
                />
              </div>
            </div>
          </div>

          <SheetFooter className="px-6 py-4 border-t">
            <div className="flex gap-2 w-full">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Release"}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
