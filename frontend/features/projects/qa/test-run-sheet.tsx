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
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateTestRun, useTestCases, useTestSuites } from "@/hooks/api/projects/qa";
import { ProjectMemberSelect } from "@/components/members/project-member-select";

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

  const cases = casesData ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      environment: "",
      browserDevice: "",
      testerId: "",
      suiteId: "none",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: "",
        environment: "",
        browserDevice: "",
        testerId: "",
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
    const testerId = values.testerId || undefined;

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
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col w-full sm:max-w-lg">
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <SheetTitle>New Test Run</SheetTitle>
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
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px]">Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} className="text-[11px]" placeholder="e.g. Sprint 12 Regression" />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel className="text-[11px]">Test Selection</FormLabel>
                  <Tabs value={mode} onValueChange={handleModeChange}>
                    <TabsList>
                      <TabsTrigger value="suite" className="text-[10px]">By Suite</TabsTrigger>
                      <TabsTrigger value="cases" className="text-[10px]">By Cases</TabsTrigger>
                    </TabsList>
                    <TabsContent value="suite" className="mt-2">
                      <FormField
                        control={form.control}
                        name="suiteId"
                        render={({ field }) => (
                          <FormItem>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select suite" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">No suite</SelectItem>
                                {(suites ?? []).map((s) => (
                                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
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
                  <FormField
                    control={form.control}
                    name="environment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px]">Environment</FormLabel>
                        <FormControl>
                          <Input {...field} className="text-[11px]" placeholder="e.g. Staging" />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="browserDevice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px]">Browser / Device</FormLabel>
                        <FormControl>
                          <Input {...field} className="text-[11px]" placeholder="e.g. Chrome 124" />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="testerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px]">Tester</FormLabel>
                      <FormControl>
                        <ProjectMemberSelect
                          projectId={projectId}
                          mode="single"
                          value={field.value}
                          onChange={(v) => field.onChange(v ?? "")}
                          allowUnassigned
                          placeholder="Assign tester…"
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
                  isPending={create.isPending}
                  loadingText="Creating…"
                >
                  Create Run
                </LoadingButton>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
