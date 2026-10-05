"use client";

import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changelogSchema, type ChangelogFormValues } from "./roadmap-schema";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AppDialog } from "@/components/shared/app-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreateChangelogEntry,
  useUpdateChangelogEntry,
} from "@/hooks/api/build/changelog";
import type { ChangelogEntry } from "@/types/projects";
import { CHANGELOG_TYPE_OPTIONS } from "./roadmap-constants";

interface ChangelogSheetProps {
  entry?: ChangelogEntry;
  onClose: () => void;
}

export function ChangelogSheet({ entry, onClose }: ChangelogSheetProps) {
  const isEdit = !!entry;
  const create = useCreateChangelogEntry();
  const update = useUpdateChangelogEntry();
  const isPending = create.isPending || update.isPending;

  const form = useForm<ChangelogFormValues, unknown, ChangelogFormValues>({
    resolver: zodResolver(changelogSchema),
    defaultValues: {
      title: entry?.title ?? "",
      content: entry?.content ?? "",
      type: (["feature", "improvement", "fix"] as const).find((v) => v === entry?.type) ?? "feature",
      version: entry?.version ?? "",
      isPublished: entry?.isPublished ?? false,
    },
  });
  useRegisterDirtyState(form.formState.isDirty);

  function handleSave(values: ChangelogFormValues) {
    if (isEdit) {
      update.mutate(
        {
          entryId: entry.id,
          title: values.title.trim(),
          content: values.content.trim(),
          version: values.version.trim() || null,
          type: values.type,
          isPublished: values.isPublished,
        },
        {
          onSuccess: () => { toast.success("Changelog entry updated"); onClose(); },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    } else {
      create.mutate(
        {
          title: values.title.trim(),
          content: values.content.trim(),
          version: values.version.trim() || undefined,
          type: values.type,
          isPublished: values.isPublished,
        },
        {
          onSuccess: () => { toast.success("Changelog entry created"); onClose(); },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    }
  }

  return (
    <AppDialog
      open
      onOpenChange={onClose}
      title={isEdit ? "Edit Changelog Entry" : "New Changelog Entry"}
      footer={
        <div className="grid w-full grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            form="changelog-form"
            isPending={isPending}
            loadingText="Saving…"
          >
            {isEdit ? "Save Changes" : "Create Entry"}
          </LoadingButton>
        </div>
      }
    >
      <Form {...form}>
        <form
          id="changelog-form"
          onSubmit={form.handleSubmit(handleSave)}
          className="space-y-4"
          noValidate
        >
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. Introducing the public roadmap" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Content</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={6} />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CHANGELOG_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
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
                    <Input {...field} placeholder="e.g. v1.4.0" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="isPublished"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">Published</p>
                    <p className="text-xs text-muted-foreground">Show this entry on the public changelog</p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="border border-border data-[state=unchecked]:bg-input"
                    />
                  </FormControl>
                </div>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </AppDialog>
  );
}
