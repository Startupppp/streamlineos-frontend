"use client";

import { useCallback } from "react";
import { useRegisterBuildDirtyState } from "@/features/build/navigation/build-dirty-state-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LayoutGrid, List, Kanban, Calendar, GitBranch } from "lucide-react";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCreateView } from "@/hooks/api/build";

const LAYOUT_TYPES = ["board", "list", "table", "calendar", "gantt"] as const;
const VISIBILITY_OPTIONS = [
  { value: "shared" as const, label: "Shared" },
  { value: "private" as const, label: "Personal" },
];

const createViewSchema = z.object({
  name: z.string().min(1, "Name is required"),
  layoutType: z.enum(LAYOUT_TYPES).optional(),
  visibility: z.enum(["shared", "private"]).optional(),
});
type CreateViewForm = z.infer<typeof createViewSchema>;

const LAYOUT_META: Record<string, { icon: React.ReactNode; label: string }> = {
  board: { icon: <Kanban className="h-4 w-4" />, label: "Board" },
  list: { icon: <List className="h-4 w-4" />, label: "List" },
  table: { icon: <LayoutGrid className="h-4 w-4" />, label: "Table" },
  calendar: { icon: <Calendar className="h-4 w-4" />, label: "Calendar" },
  gantt: { icon: <GitBranch className="h-4 w-4" />, label: "Gantt" },
};

interface CreateViewSheetProps {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateViewSheet({ projectId, open, onOpenChange, onCreated }: CreateViewSheetProps) {
  const createMutation = useCreateView();
  const form = useForm<CreateViewForm>({
    resolver: zodResolver(createViewSchema),
    defaultValues: { layoutType: "board", visibility: "shared" },
  });
  useRegisterBuildDirtyState(open && form.formState.isDirty);

  const onSubmit = useCallback(
    (data: CreateViewForm) => {
      createMutation.mutate(
        { ...data, projectId },
        {
          onSuccess: () => {
            onOpenChange(false);
            form.reset({ layoutType: "board", visibility: "shared" });
            toast.success("View created");
            onCreated();
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [createMutation, projectId, form, onOpenChange, onCreated],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>Create View</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <SheetBody className="px-6 py-5">
              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} className="mt-1.5" placeholder="View name" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="layoutType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Layout</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-3 gap-2 mt-1.5">
                          {LAYOUT_TYPES.map((l) => {
                            const m = LAYOUT_META[l];
                            const isSelected = field.value === l;
                            return (
                              <button
                                key={l}
                                type="button"
                                onClick={() => field.onChange(l)}
                                className={cn(
                                  "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-all",
                                  isSelected
                                    ? "border-primary bg-primary/5 text-foreground"
                                    : "border-border bg-muted/40 text-muted-foreground hover:border-border hover:bg-muted",
                                )}
                              >
                                {m?.icon}
                                {m?.label}
                              </button>
                            );
                          })}
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visibility</FormLabel>
                      <FormControl>
                        <div className="flex mt-1.5 rounded-md border border-border overflow-hidden">
                          {VISIBILITY_OPTIONS.map((opt, idx) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => field.onChange(opt.value)}
                              className={cn(
                                "flex-1 py-1.5 text-xs font-medium transition-colors",
                                idx > 0 && "border-l border-border",
                                field.value === opt.value
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-card text-muted-foreground hover:bg-muted",
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Filters can be applied from the board view after creation.
                </p>
              </div>
            </SheetBody>
            <div className="shrink-0 px-6 py-4 border-t">
              <LoadingButton type="submit" isPending={createMutation.isPending} loadingText="Creating…" className="w-full">
                Create View
              </LoadingButton>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
