"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Target, Plus, Calendar, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHrGoals, useCreateHrGoal, type HrGoal } from "@/hooks/api/hr";
import { useUpdateGoal } from "@/hooks/api/hr";

const STATUS_COLORS: Record<string, string> = {
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  DRAFT: "bg-slate-100 text-slate-600",
  ON_HOLD: "bg-amber-100 text-amber-700",
};

const TYPE_COLORS: Record<string, string> = {
  OKR: "bg-violet-100 text-violet-700",
  STRETCH: "bg-purple-100 text-purple-700",
  text: "bg-indigo-100 text-indigo-700",
};

function CircularProgress({ value }: { value: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(value, 100) / 100) * circ;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="rotate-[-90deg]">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke="#7c3aed"
        strokeWidth="6"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text
        x="36"
        y="36"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-slate-700 text-xs font-semibold"
        style={{ transform: "rotate(90deg)", transformOrigin: "36px 36px", fontSize: "11px" }}
      >
        {value}%
      </text>
    </svg>
  );
}

function GoalCard({
  goal,
  index,
  onEditProgress,
}: {
  goal: HrGoal;
  index: number;
  onEditProgress: (goal: HrGoal) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut", delay: index * 0.06 }}
      className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-5 flex flex-col gap-4"
    >
      <div className="flex items-start gap-4">
        <CircularProgress value={goal.progress} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 truncate">{goal.title}</h3>
          {goal.description && (
            <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{goal.description}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge className={`text-xs ${TYPE_COLORS[goal.type] ?? "bg-slate-100 text-slate-600"}`}>
              {goal.type}
            </Badge>
            <Badge className={`text-xs ${STATUS_COLORS[goal.status] ?? "bg-slate-100 text-slate-600"}`}>
              {goal.status.replace("_", " ")}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Calendar className="w-3.5 h-3.5" />
        <span>{new Date(goal.startDate).toLocaleDateString()} — {new Date(goal.endDate).toLocaleDateString()}</span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Progress</span>
          <span>{goal.progress}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(goal.progress, 100)}%` }}
          />
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="w-full text-violet-600 border-violet-200 hover:bg-violet-50"
        onClick={() => onEditProgress(goal)}
      >
        <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
        Update Progress
      </Button>
    </motion.div>
  );
}

function GoalGrid({
  goals,
  onEditProgress,
}: {
  goals: HrGoal[];
  onEditProgress: (g: HrGoal) => void;
}) {
  if (goals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
        <Target className="w-12 h-12 text-slate-300" />
        <p className="text-lg font-medium text-slate-500">No goals yet</p>
        <p className="text-sm">Create your first goal to start tracking progress</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {goals.map((g, i) => (
        <GoalCard key={g.id} goal={g} index={i} onEditProgress={onEditProgress} />
      ))}
    </div>
  );
}

export default function GoalsPage() {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [progressGoal, setProgressGoal] = useState<HrGoal | null>(null);
  const [progressValue, setProgressValue] = useState(0);

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "OKR",
    startDate: "",
    endDate: "",
    targetValue: "",
    unit: "",
    userId: "",
  });

  const { data: goals = [], isLoading, isError, refetch } = useHrGoals();
  const createGoal = useCreateHrGoal();
  const updateGoal = useUpdateGoal();

  const filtered = goals.filter(
    (g) => statusFilter === "ALL" || g.status === statusFilter,
  );
  const myGoals = goals.filter((g) => g.status !== "COMPLETED");
  const completed = goals.filter((g) => g.status === "COMPLETED");

  function handleFormChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreate() {
    if (!form.title || !form.startDate || !form.endDate) {
      toast.error("Title, start date, and end date are required");
      return;
    }
    try {
      await createGoal.mutateAsync({
        title: form.title,
        description: form.description || undefined,
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        targetValue: form.targetValue || undefined,
        unit: form.unit || undefined,
        userId: form.userId,
      });
      toast.success("Goal created");
      setSheetOpen(false);
      setForm({ title: "", description: "", type: "OKR", startDate: "", endDate: "", targetValue: "", unit: "", userId: "" });
    } catch {
      toast.error("Failed to create goal");
    }
  }

  function handleOpenProgress(goal: HrGoal) {
    setProgressGoal(goal);
    setProgressValue(goal.progress);
  }

  async function handleSaveProgress() {
    if (!progressGoal) return;
    try {
      await updateGoal.mutateAsync({ goalId: progressGoal.id, progress: progressValue });
      toast.success("Progress updated");
      setProgressGoal(null);
    } catch {
      toast.error("Failed to update progress");
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/40 p-6">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded-lg mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white/90 rounded-2xl border border-slate-200/80 p-5 space-y-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-full bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-slate-200 rounded" />
                  <div className="h-3 w-full bg-slate-100 rounded" />
                  <div className="flex gap-2">
                    <div className="h-5 w-14 bg-slate-100 rounded-full" />
                    <div className="h-5 w-20 bg-slate-100 rounded-full" />
                  </div>
                </div>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/40 flex items-center justify-center">
        <div className="bg-white/90 rounded-2xl border border-slate-200/80 shadow-xl p-10 text-center space-y-4">
          <Target className="w-12 h-12 text-red-300 mx-auto" />
          <p className="text-slate-600">Failed to load goals</p>
          <Button onClick={() => refetch()} variant="outline">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/40 p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Goals & OKRs</h1>
          <p className="text-sm text-slate-500 mt-0.5">{goals.length} goals total</p>
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200">
                <Plus className="w-4 h-4 mr-2" />
                New Goal
              </Button>
            </motion.div>
          </SheetTrigger>
          <SheetContent className="w-[420px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Create Goal</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => handleFormChange("title", e.target.value)}
                  placeholder="Goal title"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => handleFormChange("description", e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => handleFormChange("type", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OKR">OKR</SelectItem>
                    <SelectItem value="STRETCH">Stretch</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => handleFormChange("startDate", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>End Date *</Label>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => handleFormChange("endDate", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Target Value</Label>
                  <Input
                    value={form.targetValue}
                    onChange={(e) => handleFormChange("targetValue", e.target.value)}
                    placeholder="e.g. 100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Unit</Label>
                  <Input
                    value={form.unit}
                    onChange={(e) => handleFormChange("unit", e.target.value)}
                    placeholder="e.g. %"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Assignee User ID</Label>
                <Input
                  value={form.userId}
                  onChange={(e) => handleFormChange("userId", e.target.value)}
                  placeholder="User ID"
                />
              </div>
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md"
                  onClick={handleCreate}
                  disabled={createGoal.isPending}
                >
                  {createGoal.isPending ? "Creating…" : "Create Goal"}
                </Button>
              </motion.div>
            </div>
          </SheetContent>
        </Sheet>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut", delay: 0.05 }}
        className="flex flex-wrap gap-3 items-center"
      >
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      <Tabs defaultValue="all">
        <TabsList className="bg-white/80 border border-slate-200/80">
          <TabsTrigger value="all">All Goals ({filtered.length})</TabsTrigger>
          <TabsTrigger value="mine">My Goals ({myGoals.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value="all" className="mt-6">
            <GoalGrid goals={filtered} onEditProgress={handleOpenProgress} />
          </TabsContent>
          <TabsContent value="mine" className="mt-6">
            <GoalGrid goals={myGoals} onEditProgress={handleOpenProgress} />
          </TabsContent>
          <TabsContent value="completed" className="mt-6">
            <GoalGrid goals={completed} onEditProgress={handleOpenProgress} />
          </TabsContent>
        </AnimatePresence>
      </Tabs>

      <Dialog open={!!progressGoal} onOpenChange={(open) => !open && setProgressGoal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Progress</DialogTitle>
          </DialogHeader>
          {progressGoal && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-slate-600">{progressGoal.title}</p>
              <div className="space-y-2">
                <Label>Progress: {progressValue}%</Label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progressValue}
                  onChange={(e) => setProgressValue(Number(e.target.value))}
                  className="w-full accent-violet-600"
                />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={progressValue}
                  onChange={(e) => setProgressValue(Math.min(100, Math.max(0, Number(e.target.value))))}
                />
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressValue}%` }}
                />
              </div>
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
                  onClick={handleSaveProgress}
                  disabled={updateGoal.isPending}
                >
                  {updateGoal.isPending ? "Saving…" : "Save Progress"}
                </Button>
              </motion.div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
