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
import { LoadingButton } from "@/components/ui/loading-button";
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
import { getErrorMessage } from "@/lib/get-error-message";

const MEANINGFUL_TEXT_RE = /[a-zA-Z0-9À-ɏЀ-ӿ一-鿿]/;
const VERSION_RE = /^v?\d+(\.\d+)*(-[\w.]+)?(\+[\w.]+)?$|^\d{4}\.\d{2}(\.\d+)?$/;

const schema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .trim()
    .min(3, "Name must be at least 3 characters")
    .max(120, "Name must be 120 characters or fewer")
    .refine((v) => MEANINGFUL_TEXT_RE.test(v), "Name must contain at least one letter or number"),
  version: z
    .string()
    .min(1, "Version is required")
    .trim()
    .max(30, "Version must be 30 characters or fewer")
    .refine((v) => v.trim().length > 0, "Version cannot be whitespace only")
    .refine((v) => MEANINGFUL_TEXT_RE.test(v) || VERSION_RE.test(v.trim()), "Enter a valid version, e.g. 1.4.0 or v2.0.0-beta"),
  description: z
    .string()
    .nullable()
    .optional()
    .refine(
      (v) => !v || v.replace(/<[^>]*>/g, "").length <= 10000,
      "Release notes must be 10,000 characters or fewer",
    ),
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
    (html: string) => setValue("description", html || null, { shouldValidate: true }),
    [setValue],
  );

  const descriptionCharCount = (descriptionValue ?? "").replace(/<[^>]*>/g, "").length;

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
            onError: (err) => toast.error(getErrorMessage(err)),
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
            onError: (err) => toast.error(getErrorMessage(err)),
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
              <div className="flex items-center justify-between">
                <Label>Release Notes</Label>
                <span className={`text-[10px] tabular-nums ${descriptionCharCount > 10000 ? "text-destructive" : "text-muted-foreground"}`}>
                  {descriptionCharCount.toLocaleString()} / 10,000
                </span>
              </div>
              <div className="rounded-md border border-input min-h-[140px]">
                <TiptapEditor
                  content={descriptionValue ?? ""}
                  onChangeHtml={handleDescriptionChange}
                  placeholder="Describe what's in this release…"
                  menuMode="static"
                />
              </div>
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>
          </div>

          <SheetFooter className="px-6 py-4 border-t">
            <div className="grid w-full grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <LoadingButton type="submit" isPending={isPending} loadingText="Saving…">
                {isEdit ? "Save Changes" : "Create Release"}
              </LoadingButton>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
