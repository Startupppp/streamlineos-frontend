"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { toast } from "sonner";
import { useSubmitPortalChangeRequest } from "@/hooks/api/projects/client-portal";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  impact: z.string(),
});

type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = {
  title: "",
  description: "",
  impact: "",
};

interface PortalCrSheetProps {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PortalCrSheet({ projectId, open, onOpenChange }: PortalCrSheetProps) {
  const submit = useSubmitPortalChangeRequest(projectId);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });

  useEffect(() => {
    if (open) form.reset(DEFAULTS);
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
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b px-5 py-4">
          <SheetTitle>Submit a Change Request</SheetTitle>
        </SheetHeader>
        <SheetBody className="px-5 py-4">
          <form
            id="portal-cr-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label className="text-[11px]">Title *</Label>
              <Input
                {...form.register("title")}
                className="text-[11px]"
                placeholder="What needs to change?"
              />
              {form.formState.errors.title && (
                <p className="text-[10px] text-destructive">
                  {form.formState.errors.title.message}
                </p>
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
                className="min-h-[72px] resize-none text-[11px]"
                placeholder="How does this affect the project scope, timeline, or budget?"
              />
            </div>
          </form>
        </SheetBody>
        <SheetFooter className="shrink-0 flex gap-2 border-t px-5 py-3">
          <SheetClose asChild>
            <Button variant="outline" size="sm" className="text-[11px]">
              Cancel
            </Button>
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
