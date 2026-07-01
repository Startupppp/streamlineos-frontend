"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { ChevronRight, Plus } from "lucide-react";
import { useMyCareerPlan, useCareerPaths, useSaveMyPlan, useUpdateMilestone } from "@/hooks/api/hr/career";
import { getErrorMessage } from "@/lib/api-client";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  pathId: z.number().optional(),
  currentLevel: z.number().int().min(1).default(1),
  targetRole: z.string().optional(),
  targetDate: z.string().optional(),
  aspirations: z.string().optional(),
  mentorId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function MyCareerPlan() {
  const planQuery = useMyCareerPlan();
  const { data: careerPaths } = useCareerPaths();
  const saveMyPlan = useSaveMyPlan();
  const updateMilestone = useUpdateMilestone();

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
      currentLevel: plan.currentLevel ?? 1,
      targetRole: plan.targetRole ?? "",
      targetDate: plan.targetDate ?? "",
      aspirations: plan.aspirations ?? "",
      mentorId: plan.mentorId ?? "",
    });
  }, [planQuery.data, form]);

  const handleSavePlan = useCallback(
    (data: FormValues) => {
      saveMyPlan.mutate(
        {
          pathId: data.pathId,
          currentLevel: data.currentLevel,
          targetRole: data.targetRole || undefined,
          targetDate: data.targetDate || undefined,
          aspirations: data.aspirations || undefined,
          mentorId: data.mentorId || undefined,
        },
        {
          onSuccess: () => toast.success("Career plan saved"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [saveMyPlan],
  );

  const handleToggleMilestone = useCallback(
    (idx: number, completed: boolean) => {
      updateMilestone.mutate(
        { idx, completed: !completed },
        {
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [updateMilestone],
  );

  const handleAddMilestone = useCallback(() => {
    if (!newMilestoneTitle.trim() || !newMilestoneDue) return;
    const existing = planQuery.data?.milestones ?? [];
    saveMyPlan.mutate(
      {
        milestones: [
          ...existing,
          { title: newMilestoneTitle.trim(), dueDate: newMilestoneDue, completed: false },
        ],
      },
      {
        onSuccess: () => {
          toast.success("Milestone added");
          setNewMilestoneTitle("");
          setNewMilestoneDue("");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [newMilestoneTitle, newMilestoneDue, planQuery.data, saveMyPlan]);

  const watchedPathId = form.watch("pathId");
  const watchedLevel = form.watch("currentLevel");
  const selectedPath = careerPaths?.find((p) => p.id === watchedPathId);

  if (planQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="space-y-5"
    >
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-5">
        <p className="text-sm font-semibold text-foreground mb-4">My Career Plan</p>
        <Form {...form}>
          <div className="space-y-4">
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
                      <Input placeholder="e.g. Senior Engineer" className="h-9 text-sm" {...field} />
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
                      <Input type="date" className="h-9 text-sm" {...field} />
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
                    Aspirations
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your career aspirations..."
                      className="resize-none h-20 text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      onValueChange={(val) => field.onChange(val === "none" ? undefined : Number(val))}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select a path" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No path</SelectItem>
                        {careerPaths?.map((p) => (
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
                        className="h-9 text-sm"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="mentorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                    Mentor User ID{" "}
                    <span className="normal-case font-normal text-muted-foreground tracking-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Mentor user ID" className="h-9 text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              className="h-9 px-5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
              onClick={form.handleSubmit(handleSavePlan)}
              disabled={saveMyPlan.isPending}
              type="button"
            >
              {saveMyPlan.isPending ? "Saving..." : "Save Plan"}
            </Button>
          </div>
        </Form>
      </div>

      {selectedPath && selectedPath.levels.length > 0 && (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Career Ladder</p>
          <div className="overflow-x-auto pb-2">
            <div className="flex items-center gap-2 min-w-max">
              {selectedPath.levels.map((level, idx) => {
                const isCurrent = level.level === watchedLevel;
                return (
                  <div key={level.level} className="flex items-center gap-2">
                    <div
                      className={`rounded-xl border px-4 py-3 min-w-[120px] text-center transition-all duration-150 ${
                        isCurrent
                          ? "border-violet-500 bg-violet-50 shadow-md"
                          : "border-slate-200 bg-slate-50/60"
                      }`}
                    >
                      <p
                        className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                          isCurrent ? "text-violet-600" : "text-muted-foreground"
                        }`}
                      >
                        Level {level.level}
                      </p>
                      <p className={`text-xs font-semibold ${isCurrent ? "text-violet-800" : "text-foreground"}`}>
                        {level.title}
                      </p>
                    </div>
                    {idx < selectedPath.levels.length - 1 && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-5">
        <p className="text-sm font-semibold text-foreground mb-4">Milestones</p>

        {planQuery.data && planQuery.data.milestones.length > 0 ? (
          <div className="space-y-2 mb-4">
            {planQuery.data.milestones.map((milestone, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: "easeOut", delay: idx * 0.05 }}
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5"
              >
                <Checkbox
                  checked={milestone.completed}
                  onCheckedChange={() => handleToggleMilestone(idx, milestone.completed)}
                  disabled={updateMilestone.isPending}
                  id={`milestone-${idx}`}
                />
                <label
                  htmlFor={`milestone-${idx}`}
                  className={`flex-1 min-w-0 text-sm cursor-pointer ${milestone.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
                >
                  {milestone.title}
                </label>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {format(new Date(milestone.dueDate), "dd MMM yyyy")}
                </span>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mb-4">No milestones yet. Add one below.</p>
        )}

        <div className="flex items-end gap-2 pt-3 border-t border-slate-100">
          <div className="flex-1 min-w-0">
            <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider block mb-1.5">
              Milestone Title
            </label>
            <Input
              placeholder="e.g. Complete leadership training"
              className="h-8 text-sm"
              value={newMilestoneTitle}
              onChange={(e) => setNewMilestoneTitle(e.target.value)}
            />
          </div>
          <div className="w-36 shrink-0">
            <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider block mb-1.5">
              Due Date
            </label>
            <Input
              type="date"
              className="h-8 text-sm"
              value={newMilestoneDue}
              onChange={(e) => setNewMilestoneDue(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 shrink-0"
            onClick={handleAddMilestone}
            disabled={saveMyPlan.isPending || !newMilestoneTitle.trim() || !newMilestoneDue}
            type="button"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
