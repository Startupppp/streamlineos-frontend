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
  SheetBody,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import dynamic from "next/dynamic";

const TiptapEditor = dynamic(
  () => import("@/components/editor/tiptap-editor").then((m) => ({ default: m.TiptapEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-md border border-input bg-background animate-pulse min-h-[140px]" />
    ),
  },
);
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

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: release?.name ?? "",
      version: release?.version ?? "",
      description: release?.description ?? null,
      status: release?.status ?? "draft",
      releaseDate: release?.releaseDate ?? null,
    },
  });

  const descriptionValue = form.watch("description");

  const descriptionCharCount = (descriptionValue ?? "").replace(/<[^>]*>/g, "").length;

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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <SheetBody className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Q3 Release" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Version <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 1.4.0" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="released">Released</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="releaseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Release Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value ?? ""}
                          onChange={(val) => field.onChange(val || null)}
                          placeholder="Pick a date"
                          className="text-sm"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Release Notes</FormLabel>
                      <span className={`text-[10px] tabular-nums ${descriptionCharCount > 10000 ? "text-destructive" : "text-muted-foreground"}`}>
                        {descriptionCharCount.toLocaleString()} / 10,000
                      </span>
                    </div>
                    <FormControl>
                      <div className="rounded-md border border-input min-h-[140px]">
                        <TiptapEditor
                          content={field.value ?? ""}
                          onChangeHtml={(html) => field.onChange(html || null)}
                          placeholder="Describe what's in this release…"
                          menuMode="static"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </SheetBody>

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
        </Form>
      </SheetContent>
    </Sheet>
  );
}
