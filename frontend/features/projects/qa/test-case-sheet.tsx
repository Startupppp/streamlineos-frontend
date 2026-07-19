"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCreateTestCase, useUpdateTestCase } from "@/hooks/api/projects/qa";
import { useProject } from "@/hooks/api/projects/projects";
import { TicketCombobox } from "@/components/ui/ticket-combobox";
import type { TestCase, TestSuite } from "@/types/projects";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  suiteId: z.string(),
  preconditions: z.string(),
  steps: z.array(z.object({ action: z.string(), expected: z.string() })),
  expectedResult: z.string(),
  priority: z.enum(["low", "medium", "high"]),
  automationStatus: z.enum(["manual", "automated", "planned"]),
  component: z.string(),
  linkedTicketId: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface TestCaseSheetProps {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCase: TestCase | null;
  suites: TestSuite[];
}

export function TestCaseSheet({
  projectId,
  open,
  onOpenChange,
  editCase,
  suites,
}: TestCaseSheetProps) {
  const create = useCreateTestCase();
  const update = useUpdateTestCase();
  const { data: project } = useProject(projectId);
  const projectKey = project?.key ?? "";

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      suiteId: "none",
      preconditions: "",
      steps: [],
      expectedResult: "",
      priority: "medium",
      automationStatus: "manual",
      component: "",
      linkedTicketId: "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "steps" });

  useEffect(() => {
    if (open) {
      form.reset(
        editCase
          ? {
              title: editCase.title,
              suiteId: editCase.suiteId != null ? String(editCase.suiteId) : "none",
              preconditions: editCase.preconditions ?? "",
              steps: editCase.steps,
              expectedResult: editCase.expectedResult ?? "",
              priority: editCase.priority,
              automationStatus: editCase.automationStatus,
              component: editCase.component ?? "",
              linkedTicketId:
                editCase.linkedTicketId != null ? String(editCase.linkedTicketId) : "",
            }
          : {
              title: "",
              suiteId: "none",
              preconditions: "",
              steps: [],
              expectedResult: "",
              priority: "medium",
              automationStatus: "manual",
              component: "",
              linkedTicketId: "",
            },
      );
    }
  }, [open, editCase, form]);

  function addStep() {
    append({ action: "", expected: "" });
  }

  function handleSubmit(values: FormValues) {
    const suiteId =
      values.suiteId !== "none" && values.suiteId !== "" ? Number(values.suiteId) : undefined;
    const linkedTicketId = values.linkedTicketId ? Number(values.linkedTicketId) : undefined;

    const input = {
      projectId,
      title: values.title,
      suiteId,
      preconditions: values.preconditions || undefined,
      steps: values.steps,
      expectedResult: values.expectedResult || undefined,
      priority: values.priority,
      automationStatus: values.automationStatus,
      component: values.component || undefined,
      linkedTicketId,
    };

    if (editCase) {
      update.mutate(
        { ...input, id: editCase.id },
        {
          onSuccess: () => {
            toast.success("Test case updated");
            onOpenChange(false);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    } else {
      create.mutate(input, {
        onSuccess: () => {
          toast.success("Test case created");
          onOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col w-full sm:max-w-lg">
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <SheetTitle>{editCase ? "Edit Test Case" : "New Test Case"}</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <SheetBody>
              <div className="px-5 py-4 space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px]">Title <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} className="text-[11px]" placeholder="Test case title" />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="suiteId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px]">Suite</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No suite</SelectItem>
                            {suites.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px]">Priority</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="automationStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px]">Automation</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="automated">Automated</SelectItem>
                            <SelectItem value="planned">Planned</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="component"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px]">Component</FormLabel>
                        <FormControl>
                          <Input {...field} className="text-[11px]" placeholder="e.g. Auth" />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="preconditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px]">Preconditions</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="text-[11px] min-h-[60px] resize-none"
                          placeholder="Steps to set up before testing..."
                        />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-[11px]">Steps</FormLabel>
                    <AnimatedIconButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px]"
                      onClick={addStep}
                      icon={PlusIcon}
                      iconSize={12}
                      iconClassName="mr-1"
                    >
                      Add step
                    </AnimatedIconButton>
                  </div>
                  {fields.length === 0 && (
                    <p className="text-[10px] text-muted-foreground">No steps yet.</p>
                  )}
                  {fields.map((fieldItem, idx) => (
                    <div key={fieldItem.id} className="grid grid-cols-[1fr_1fr_auto] gap-1.5 items-start">
                      <Input
                        {...form.register(`steps.${idx}.action`)}
                        className="text-[10px]"
                        placeholder={`Step ${idx + 1} action`}
                      />
                      <Input
                        {...form.register(`steps.${idx}.expected`)}
                        className="text-[10px]"
                        placeholder="Expected result"
                      />
                      <AnimatedIconButton
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => remove(idx)}
                        icon={Trash2Icon}
                        iconSize={12}
                      />
                    </div>
                  ))}
                </div>

                <FormField
                  control={form.control}
                  name="expectedResult"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px]">Expected Result</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="text-[11px] min-h-[60px] resize-none"
                          placeholder="Overall expected outcome..."
                        />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="linkedTicketId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px]">Linked Ticket</FormLabel>
                      <FormControl>
                        <TicketCombobox
                          projectId={projectId}
                          projectKey={projectKey}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Link a ticket…"
                          allowClear
                          className="text-[11px]"
                        />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
              </div>
            </SheetBody>

            <SheetFooter className="px-5 py-3 border-t shrink-0">
              <div className="grid w-full grid-cols-2 gap-2">
                <SheetClose asChild>
                  <Button variant="outline" size="sm" className="text-[11px]">Cancel</Button>
                </SheetClose>
                <LoadingButton
                  type="submit"
                  size="sm"
                  className="text-[11px]"
                  isPending={isPending}
                  loadingText="Saving…"
                >
                  {editCase ? "Save Changes" : "Create"}
                </LoadingButton>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
