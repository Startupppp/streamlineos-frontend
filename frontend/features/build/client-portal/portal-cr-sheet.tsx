"use client";

import { useEffect } from "react";
import { useRegisterBuildDirtyState } from "@/features/build/navigation/build-dirty-state-context";
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
import dynamic from "next/dynamic";

const TiptapEditor = dynamic(
  () => import("@/components/editor/tiptap-editor").then((m) => ({ default: m.TiptapEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-md border border-input bg-background animate-pulse min-h-[120px]" />
    ),
  },
);
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSubmitPortalChangeRequest } from "@/hooks/api/build/client-portal";

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
  useRegisterBuildDirtyState(open && form.formState.isDirty);

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
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b px-5 py-4">
          <SheetTitle>Submit a Change Request</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <SheetBody className="px-5 py-4">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-dense">Title <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} className="text-dense" placeholder="What needs to change?" />
                      </FormControl>
                      <FormMessage className="text-micro" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-dense">Description</FormLabel>
                      <FormControl>
                        <TiptapEditor
                          content={field.value}
                          output="html"
                          onChangeHtml={field.onChange}
                          placeholder="Describe the change in detail..."
                          minHeightClassName="min-h-[100px]"
                          menuMode="static"
                        />
                      </FormControl>
                      <FormMessage className="text-micro" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="impact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-dense">Business Impact</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="min-h-[72px] resize-none text-dense"
                          placeholder="How does this affect the project scope, timeline, or budget?"
                        />
                      </FormControl>
                      <FormMessage className="text-micro" />
                    </FormItem>
                  )}
                />
              </div>
            </SheetBody>
            <SheetFooter className="shrink-0 flex gap-2 border-t px-5 py-3">
              <SheetClose asChild>
                <Button variant="outline" size="sm" className="text-dense">Cancel</Button>
              </SheetClose>
              <LoadingButton
                type="submit"
                size="sm"
                className="text-dense"
                isPending={submit.isPending}
                loadingText="Submitting…"
              >
                Submit Request
              </LoadingButton>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
