"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { MessageSquare, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useFeedbackCycles,
  useCreateFeedbackCycle,
  useUpdateFeedbackCycleStatus,
  type FeedbackCycle,
} from "@/hooks/api/hr";

const CYCLE_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  ACTIVE: "bg-green-100 text-green-700",
  CLOSED: "bg-blue-100 text-blue-700",
  ARCHIVED: "bg-violet-100 text-violet-700",
};

interface QuestionBuilder {
  id: string;
  text: string;
  type: "rating" | "text";
}

interface CycleFormState {
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  isAnonymous: boolean;
  questions: QuestionBuilder[];
}

export function CyclesTab() {
  const { data: cycles = [], isLoading } = useFeedbackCycles();
  const createCycle = useCreateFeedbackCycle();
  const updateStatus = useUpdateFeedbackCycleStatus();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<CycleFormState>({
    name: "",
    type: "360",
    startDate: "",
    endDate: "",
    isAnonymous: true,
    questions: [{ id: crypto.randomUUID(), text: "", type: "rating" }],
  });

  function handleFormChange(field: keyof CycleFormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addQuestion() {
    setForm((prev) => ({
      ...prev,
      questions: [...prev.questions, { id: crypto.randomUUID(), text: "", type: "rating" }],
    }));
  }

  function removeQuestion(id: string) {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== id),
    }));
  }

  function updateQuestion(id: string, field: keyof QuestionBuilder, value: string) {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === id ? { ...q, [field]: value } : q,
      ),
    }));
  }

  async function handleCreate() {
    if (!form.name || !form.startDate || !form.endDate) {
      toast.error("Name, start date, and end date are required");
      return;
    }
    try {
      await createCycle.mutateAsync({
        name: form.name,
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        isAnonymous: form.isAnonymous,
        questions: form.questions.filter((q) => q.text.trim()),
      });
      toast.success("Feedback cycle created");
      setSheetOpen(false);
      setForm({
        name: "",
        type: "360",
        startDate: "",
        endDate: "",
        isAnonymous: true,
        questions: [{ id: crypto.randomUUID(), text: "", type: "rating" }],
      });
    } catch {
      toast.error("Failed to create cycle");
    }
  }

  async function handleActivate(cycle: FeedbackCycle) {
    try {
      await updateStatus.mutateAsync({ id: cycle.id, status: "ACTIVE" });
      toast.success("Cycle activated");
    } catch {
      toast.error("Failed to activate cycle");
    }
  }

  async function handleClose(cycle: FeedbackCycle) {
    try {
      await updateStatus.mutateAsync({ id: cycle.id, status: "CLOSED" });
      toast.success("Cycle closed");
    } catch {
      toast.error("Failed to close cycle");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white/90 rounded-2xl border border-slate-200/80 p-5 animate-pulse space-y-3">
            <div className="h-5 w-1/3 bg-slate-200 rounded" />
            <div className="flex gap-2">
              <div className="h-5 w-16 bg-slate-100 rounded-full" />
              <div className="h-5 w-16 bg-slate-100 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Cycle
              </Button>
            </motion.div>
          </SheetTrigger>
          <SheetContent className="w-[480px] p-0 flex flex-col gap-0">
            <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
              <SheetTitle>Create Feedback Cycle</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => handleFormChange("name", e.target.value)}
                  placeholder="e.g. Q2 2025 360 Review"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => handleFormChange("type", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="360">360°</SelectItem>
                    <SelectItem value="PEER">Peer</SelectItem>
                    <SelectItem value="UPWARD">Upward</SelectItem>
                    <SelectItem value="DOWNWARD">Downward</SelectItem>
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
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleFormChange("isAnonymous", !form.isAnonymous)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    form.isAnonymous ? "bg-violet-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                      form.isAnonymous ? "left-5" : "left-0.5"
                    }`}
                  />
                </button>
                <Label className="cursor-pointer">Anonymous responses</Label>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Questions</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addQuestion}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add
                  </Button>
                </div>
                {form.questions.map((q, idx) => (
                  <div key={q.id} className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">Q{idx + 1}</span>
                      {form.questions.length > 1 && (
                        <button onClick={() => removeQuestion(q.id)} className="text-slate-400 hover:text-red-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <Input
                      placeholder="Question text"
                      value={q.text}
                      onChange={(e) => updateQuestion(q.id, "text", e.target.value)}
                    />
                    <Select
                      value={q.type}
                      onValueChange={(v) => updateQuestion(q.id, "type", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rating">Rating (1-5)</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button
                  className="w-full"
                  onClick={handleCreate}
                  disabled={createCycle.isPending}
                >
                  {createCycle.isPending ? "Creating…" : "Create Cycle"}
                </Button>
              </motion.div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {cycles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <MessageSquare className="w-12 h-12 text-slate-300" />
          <p className="text-slate-500 font-medium">No feedback cycles yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cycles.map((cycle, i) => (
            <motion.div
              key={cycle.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut", delay: i * 0.06 }}
              className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-800">{cycle.name}</h3>
                    <Badge className={`text-xs ${CYCLE_STATUS_STYLES[cycle.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {cycle.status}
                    </Badge>
                    <Badge className="text-xs bg-indigo-100 text-indigo-700">{cycle.type}</Badge>
                    {cycle.isAnonymous && (
                      <Badge className="text-xs bg-slate-100 text-slate-500">Anonymous</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {new Date(cycle.startDate).toLocaleDateString()} — {new Date(cycle.endDate).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-slate-400">{cycle.questions.length} questions</p>
                </div>
                <div className="flex gap-2">
                  {cycle.status === "DRAFT" && (
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-xs"
                      onClick={() => handleActivate(cycle)}
                    >
                      Activate
                    </Button>
                  )}
                  {cycle.status === "ACTIVE" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-slate-600"
                      onClick={() => handleClose(cycle)}
                    >
                      Close
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
