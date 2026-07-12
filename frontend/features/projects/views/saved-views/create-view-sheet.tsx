"use client";

import { useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LayoutGrid, List, Kanban, Calendar, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCreateView } from "@/hooks/api/projects";

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
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form id="view-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <Label htmlFor="view-name">Name</Label>
              <Input id="view-name" className="mt-1.5" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div>
              <Label>Layout</Label>
              <Controller
                control={form.control}
                name="layoutType"
                render={({ field }) => (
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
                )}
              />
            </div>
            <div>
              <Label>Visibility</Label>
              <Controller
                control={form.control}
                name="visibility"
                render={({ field }) => (
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
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Filters can be applied from the board view after creation.
            </p>
          </form>
        </div>
        <div className="shrink-0 px-6 py-4 border-t">
          <Button
            type="submit"
            form="view-form"
            disabled={createMutation.isPending}
            className="w-full"
          >
            {createMutation.isPending ? "Creating..." : "Create View"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
