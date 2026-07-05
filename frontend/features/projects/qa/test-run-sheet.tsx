"use client";

import { useEffect, useState } from "react";
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
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useCreateTestRun, useTestCases, useTestSuites } from "@/hooks/api/projects/qa";
import { useOrgMembers } from "@/hooks/api/organization";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  environment: z.string(),
  browserDevice: z.string(),
  testerId: z.string(),
  suiteId: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface TestRunSheetProps {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TestRunSheet({ projectId, open, onOpenChange }: TestRunSheetProps) {
  const create = useCreateTestRun();
  const [mode, setMode] = useState<"suite" | "cases">("suite");
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<number>>(new Set());

  const { data: suites } = useTestSuites(projectId);
  const { data: casesData } = useTestCases(projectId);
  const { data: membersData } = useOrgMembers(1, 100);

  const cases = casesData ?? [];
  const members = membersData?.data ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      environment: "",
      browserDevice: "",
      testerId: "none",
      suiteId: "none",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: "",
        environment: "",
        browserDevice: "",
        testerId: "none",
        suiteId: "none",
      });
      setSelectedCaseIds(new Set());
      setMode("suite");
    }
  }, [open, form]);

  function toggleCase(id: number) {
    setSelectedCaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleModeChange(v: string) {
    setMode(v as "suite" | "cases");
  }

  function handleSubmit(values: FormValues) {
    const suiteId =
      mode === "suite" && values.suiteId !== "none" ? Number(values.suiteId) : undefined;
    const caseIds =
      mode === "cases" && selectedCaseIds.size > 0 ? Array.from(selectedCaseIds) : undefined;
    const testerId =
      values.testerId !== "none" && values.testerId !== "" ? values.testerId : undefined;

    create.mutate(
      {
        projectId,
        name: values.name,
        environment: values.environment || undefined,
        browserDevice: values.browserDevice || undefined,
        testerId,
        suiteId,
        caseIds,
      },
      {
        onSuccess: () => {
          toast.success("Test run created");
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to create test run"),
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col w-full sm:max-w-lg">
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <SheetTitle>New Test Run</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <form
            id="run-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="px-5 py-4 space-y-4"
          >
            <div className="space-y-1.5">
              <Label className="text-[11px]">Name *</Label>
              <Input
                {...form.register("name")}
                className="h-8 text-[11px]"
                placeholder="e.g. Sprint 12 Regression"
              />
              {form.formState.errors.name && (
                <p className="text-[10px] text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[11px]">Test Selection</Label>
              <Tabs value={mode} onValueChange={handleModeChange}>
                <TabsList className="h-7">
                  <TabsTrigger value="suite" className="text-[10px] h-5">
                    By Suite
                  </TabsTrigger>
                  <TabsTrigger value="cases" className="text-[10px] h-5">
                    By Cases
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="suite" className="mt-2">
                  <Select
                    value={form.watch("suiteId")}
                    onValueChange={(v) => form.setValue("suiteId", v)}
                  >
                    <SelectTrigger className="h-8 text-[11px]">
                      <SelectValue placeholder="Select suite" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No suite</SelectItem>
                      {(suites ?? []).map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TabsContent>
                <TabsContent value="cases" className="mt-2">
                  <ScrollArea className="h-40 border rounded-md p-2">
                    {cases.length === 0 && (
                      <p className="text-[10px] text-muted-foreground">No test cases found.</p>
                    )}
                    {cases.map((tc) => (
                      <div key={tc.id} className="flex items-center gap-2 py-1">
                        <Checkbox
                          id={`tc-${tc.id}`}
                          checked={selectedCaseIds.has(tc.id)}
                          onCheckedChange={() => toggleCase(tc.id)}
                        />
                        <label htmlFor={`tc-${tc.id}`} className="text-[11px] cursor-pointer">
                          TC-{tc.caseNumber} — {tc.title}
                        </label>
                      </div>
                    ))}
                  </ScrollArea>
                  {selectedCaseIds.size > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {selectedCaseIds.size} case(s) selected
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Environment</Label>
                <Input
                  {...form.register("environment")}
                  className="h-8 text-[11px]"
                  placeholder="e.g. Staging"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Browser / Device</Label>
                <Input
                  {...form.register("browserDevice")}
                  className="h-8 text-[11px]"
                  placeholder="e.g. Chrome 124"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px]">Tester</Label>
              <Select
                value={form.watch("testerId")}
                onValueChange={(v) => form.setValue("testerId", v)}
              >
                <SelectTrigger className="h-8 text-[11px]">
                  <SelectValue placeholder="Assign tester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.name ?? m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            form="run-form"
            size="sm"
            className="text-[11px]"
            disabled={create.isPending}
          >
            {create.isPending ? "Creating..." : "Create Run"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
