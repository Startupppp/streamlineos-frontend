"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { toast } from "sonner";
import { useSubmitPortalChangeRequest } from "@/hooks/api/projects/client-portal";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  impact: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface PortalCrSheetProps {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PortalCrSheet({ projectId, open, onOpenChange }: PortalCrSheetProps) {
  const submit = useSubmitPortalChangeRequest(projectId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", impact: "" },
  });

  useEffect(() => {
    if (!open) form.reset({ title: "", description: "", impact: "" });
  }, [open, form]);

  function handleSubmit(values: FormValues) {
    submit.mutate(
      {
        title: values.title,
        description: values.description || undefined,
        impact: values.impact || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Change request submitted");
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to submit change request"),
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col w-full sm:max-w-lg">
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <SheetTitle>Submit a Change Request</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <form
            id="portal-cr-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="px-5 py-4 space-y-4"
          >
            <div className="space-y-1.5">
              <Label className="text-[11px]">Title *</Label>
              <Input
                {...form.register("title")}
                className="h-8 text-[11px]"
                placeholder="What needs to change?"
              />
              {form.formState.errors.title && (
                <p className="text-[10px] text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px]">Description</Label>
              <TiptapEditor
                content={form.watch("description")}
                output="html"
                onChangeHtml={(v) => form.setValue("description", v)}
                placeholder="Describe the change in detail..."
                minHeightClassName="min-h-[100px]"
                menuMode="static"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px]">Business Impact</Label>
              <Textarea
                {...form.register("impact")}
                className="text-[11px] min-h-[72px] resize-none"
                placeholder="How does this affect the project scope, timeline, or budget?"
              />
            </div>
          </form>
        </ScrollArea>
        <SheetFooter className="px-5 py-3 border-t shrink-0 flex gap-2">
          <SheetClose asChild>
            <Button variant="outline" size="sm" className="text-[11px]">Cancel</Button>
          </SheetClose>
          <LoadingButton
            type="submit"
            form="portal-cr-form"
            size="sm"
            className="text-[11px]"
            isPending={submit.isPending}
            loadingText="Submitting…"
          >
            Submit Request
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
