"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { kbNoteSchema, type KbNoteFormValues } from "./kb-note-schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AppSheet } from "@/components/shared/app-sheet";
import { useCreateKbSourceNote } from "@/hooks/api/kb/sources";
import { getErrorMessage } from "@/lib/get-error-message";

interface KbNoteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KbNoteSheet({ open, onOpenChange }: KbNoteSheetProps) {
  const createNote = useCreateKbSourceNote();

  const form = useForm<KbNoteFormValues>({
    resolver: zodResolver(kbNoteSchema),
    defaultValues: { title: "", text: "" },
  });

  function handleOpenChange(next: boolean) {
    if (!next) form.reset();
    onOpenChange(next);
  }

  function handleClose() {
    form.reset();
    onOpenChange(false);
  }

  function handleSave(values: KbNoteFormValues) {
    createNote.mutate(
      { title: values.title.trim(), text: values.text.trim() },
      {
        onSuccess: () => {
          toast.success("Note added");
          form.reset();
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Add note"
      description="Paste or type content for the AI to learn from."
      footer={
        <div className="grid w-full grid-cols-2 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            form="kb-note-form"
            size="sm"
            isPending={createNote.isPending}
            loadingText="Saving…"
          >
            Save note
          </LoadingButton>
        </div>
      }
    >
      <Form {...form}>
        <form id="kb-note-form" onSubmit={form.handleSubmit(handleSave)} className="space-y-3">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Title <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Note title" className="text-sm" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="text"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Content <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Paste or type the content you want the AI to learn…"
                    rows={6}
                    className="text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </AppSheet>
  );
}
