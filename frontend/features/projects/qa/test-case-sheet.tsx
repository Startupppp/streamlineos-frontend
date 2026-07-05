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
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateTestCase, useUpdateTestCase } from "@/hooks/api/projects/qa";
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
          onError: () => toast.error("Failed to update test case"),
        },
      );
    } else {
      create.mutate(input, {
        onSuccess: () => {
          toast.success("Test case created");
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to create test case"),
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

        <ScrollArea className="flex-1">
          <form
            id="tc-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="px-5 py-4 space-y-4"
          >
            <div className="space-y-1.5">
              <Label className="text-[11px]">Title *</Label>
              <Input
                {...form.register("title")}
                className="h-8 text-[11px]"
                placeholder="Test case title"
              />
              {form.formState.errors.title && (
                <p className="text-[10px] text-destructive">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Suite</Label>
                <Select
                  value={form.watch("suiteId")}
                  onValueChange={(v) => form.setValue("suiteId", v)}
                >
                  <SelectTrigger className="h-8 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No suite</SelectItem>
                    {suites.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Priority</Label>
                <Select
                  value={form.watch("priority")}
                  onValueChange={(v) =>
                    form.setValue("priority", v as FormValues["priority"])
                  }
                >
                  <SelectTrigger className="h-8 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Automation</Label>
                <Select
                  value={form.watch("automationStatus")}
                  onValueChange={(v) =>
                    form.setValue("automationStatus", v as FormValues["automationStatus"])
                  }
                >
                  <SelectTrigger className="h-8 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="automated">Automated</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Component</Label>
                <Input
                  {...form.register("component")}
                  className="h-8 text-[11px]"
                  placeholder="e.g. Auth"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px]">Preconditions</Label>
              <Textarea
                {...form.register("preconditions")}
                className="text-[11px] min-h-[60px] resize-none"
                placeholder="Steps to set up before testing..."
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[11px]">Steps</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={addStep}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add step
                </Button>
              </div>
              {fields.length === 0 && (
                <p className="text-[10px] text-muted-foreground">No steps yet.</p>
              )}
              {fields.map((field, idx) => (
                <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] gap-1.5 items-start">
                  <Input
                    {...form.register(`steps.${idx}.action`)}
                    className="h-7 text-[10px]"
                    placeholder={`Step ${idx + 1} action`}
                  />
                  <Input
                    {...form.register(`steps.${idx}.expected`)}
                    className="h-7 text-[10px]"
                    placeholder="Expected result"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(idx)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px]">Expected Result</Label>
              <Textarea
                {...form.register("expectedResult")}
                className="text-[11px] min-h-[60px] resize-none"
                placeholder="Overall expected outcome..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px]">Linked Ticket ID</Label>
              <Input
                {...form.register("linkedTicketId")}
                className="h-8 text-[11px]"
                placeholder="Ticket number (optional)"
                type="number"
              />
            </div>
          </form>
        </ScrollArea>

        <SheetFooter className="px-5 py-3 border-t shrink-0 flex gap-2">
          <SheetClose asChild>
            <Button variant="outline" size="sm" className="text-[11px]">
              Cancel
            </Button>
          </SheetClose>
          <Button
            type="submit"
            form="tc-form"
            size="sm"
            className="text-[11px]"
            disabled={isPending}
          >
            {isPending ? "Saving..." : editCase ? "Save Changes" : "Create"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
