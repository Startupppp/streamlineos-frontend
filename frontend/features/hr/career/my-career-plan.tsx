"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, ChevronRight, Plus } from "lucide-react";
import { getErrorMessage } from "@/lib/api-client";
import {
  useMyCareerPlan,
  useCareerPaths,
  useSaveMyPlan,
  useUpdateCareerMilestone,
  type Milestone,
} from "@/hooks/api/hr/career";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCombobox } from "@/components/ui/user-combobox";

const schema = z.object({
  pathId: z.number().optional(),
  currentLevel: z.number().int().min(1),
  targetRole: z.string().optional(),
  targetDate: z.string().optional(),
  aspirations: z.string().optional(),
  mentorId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function MyCareerPlan() {
  const planQuery = useMyCareerPlan();
  const pathsQuery = useCareerPaths();
  const savePlan = useSaveMyPlan();
  const updateMilestone = useUpdateCareerMilestone();

  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDue, setNewMilestoneDue] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      pathId: undefined,
      currentLevel: 1,
      targetRole: "",
      targetDate: "",
      aspirations: "",
      mentorId: "",
    },
  });

  useEffect(() => {
    const plan = planQuery.data;
    if (!plan) return;
    form.reset({
      pathId: plan.pathId ?? undefined,
      currentLevel: plan.currentLevel,
      targetRole: plan.targetRole ?? "",
      targetDate: plan.targetDate ?? "",
      aspirations: plan.aspirations ?? "",
      mentorId: plan.mentorId ?? "",
    });
  }, [planQuery.data, form]);

  const handleSavePlan = useCallback(
    (data: FormValues) => {
      savePlan.mutate(data, {
        onSuccess: () => toast.success("Career plan saved"),
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [savePlan],
  );

  const handleToggleMilestone = useCallback(
    (idx: number, milestone: Milestone) => {
      updateMilestone.mutate(
        { idx, completed: !milestone.completed },
        {
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [updateMilestone],
  );

  const handleAddMilestone = useCallback(() => {
    const title = newMilestoneTitle.trim();
    const dueDate = newMilestoneDue.trim();
    if (!title || !dueDate) return;
    const existing = planQuery.data?.milestones ?? [];
    savePlan.mutate(
      {
        milestones: [...existing, { title, dueDate, completed: false }],
      },
      {
        onSuccess: () => {
          setNewMilestoneTitle("");
          setNewMilestoneDue("");
          toast.success("Milestone added");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [newMilestoneTitle, newMilestoneDue, planQuery.data?.milestones, savePlan]);

  const selectedPathId = form.watch("pathId");
  const selectedPath = pathsQuery.data?.find((p) => p.id === selectedPathId);

  if (planQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  const plan = planQuery.data;
  const milestones = plan?.milestones ?? [];

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="bg-card rounded-2xl border border-border shadow-sm p-5"
      >
        <h3 className="text-sm font-semibold text-foreground mb-4">Career Plan</h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSavePlan)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="targetRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                      Target Role
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Senior Engineer" className="h-8 text-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                      Target Date
                    </FormLabel>
                    <FormControl>
                      <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="h-8 text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="pathId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                    Career Path
                  </FormLabel>
                  <Select
                    value={field.value !== undefined ? String(field.value) : "none"}
                    onValueChange={(v) => field.onChange(v === "none" ? undefined : Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select a path" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No path</SelectItem>
                      {(pathsQuery.data ?? []).map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currentLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                      Current Level
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        className="h-8 text-sm"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mentorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                      Mentor{" "}
                      <span className="normal-case font-normal text-muted-foreground tracking-normal">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <UserCombobox
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="Select mentor…"
                        allowUnassigned
                        className="h-8 text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="aspirations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                    Aspirations{" "}
                    <span className="normal-case font-normal text-muted-foreground tracking-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your career aspirations..."
                      className="resize-none text-sm h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={savePlan.isPending}
              className="w-full sm:w-auto"
            >
              Save Plan
            </Button>
          </form>
        </Form>
      </motion.div>

      {selectedPath && selectedPath.levels.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut", delay: 0.05 }}
          className="bg-card rounded-2xl border border-border shadow-sm p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Career Ladder — {selectedPath.name}
          </h3>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {selectedPath.levels.map((level, idx) => {
              const isCurrent = level.level === form.watch("currentLevel");
              return (
                <div key={level.level} className="flex items-center gap-1 shrink-0">
                  <div
                    className={`rounded-xl border px-3 py-2 text-center min-w-[96px] transition-all ${
                      isCurrent
                        ? "border-violet-500 dark:border-violet-400 bg-violet-50 dark:bg-violet-500/10 shadow-sm shadow-violet-100 dark:shadow-violet-500/10"
                        : "border-border bg-muted/30"
                    }`}
                  >
                    <div
                      className={`text-[10px] font-bold mb-0.5 ${isCurrent ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground"}`}
                    >
                      Level {level.level}
                    </div>
                    <div
                      className={`text-xs font-semibold ${isCurrent ? "text-violet-900 dark:text-violet-300" : "text-foreground"}`}
                    >
                      {level.title}
                    </div>
                  </div>
                  {idx < selectedPath.levels.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut", delay: 0.1 }}
        className="bg-card rounded-2xl border border-border shadow-sm p-5"
      >
        <h3 className="text-sm font-semibold text-foreground mb-4">Milestones</h3>

        {milestones.length === 0 && (
          <p className="text-xs text-muted-foreground mb-4">No milestones yet. Add one below.</p>
        )}

        <div className="space-y-2 mb-4">
          {milestones.map((milestone, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5"
            >
              <Checkbox
                id={`milestone-${idx}`}
                checked={milestone.completed}
                onCheckedChange={() => handleToggleMilestone(idx, milestone)}
                disabled={updateMilestone.isPending}
                className="shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium leading-none ${
                    milestone.completed ? "line-through text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {milestone.title}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Due {format(new Date(milestone.dueDate), "dd MMM yyyy")}
                </p>
              </div>
              {milestone.completed && <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t border-border pt-4">
          <Input
            placeholder="Milestone title"
            className="h-8 text-sm flex-1"
            value={newMilestoneTitle}
            onChange={(e) => setNewMilestoneTitle(e.target.value)}
          />
          <DatePicker
            className="h-8 text-sm w-36 shrink-0"
            value={newMilestoneDue}
            onChange={setNewMilestoneDue}
            placeholder="Pick a date"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1 text-xs"
            onClick={handleAddMilestone}
            disabled={!newMilestoneTitle.trim() || !newMilestoneDue || savePlan.isPending}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
