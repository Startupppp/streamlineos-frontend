"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { PlusIcon, XIcon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetBody,
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
import {
  clearEndIfInvalid,
  isEndInvalidForStart,
  planningEndPickerProps,
  planningStartPickerProps,
} from "@/lib/date-constraints";
import { getTodayString } from "@/lib/date-utils";
import { randomId } from "@/lib/random-id";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";

const CYCLE_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  ACTIVE: "bg-status-success-surface text-status-success-ink",
  CLOSED: "bg-status-info-surface text-status-info-ink",
  ARCHIVED: "bg-status-info-surface text-status-info-ink",
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

function RemoveQuestionButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button
      type="button"
      aria-label="Remove question"
      onClick={onClick}
      className="text-muted-foreground hover:text-status-danger-ink"
      {...hoverHandlers}
    >
      <XIcon ref={iconRef} size={14} />
    </button>
  );
}

export function CyclesTab() {
  const { data: cycles = [], isLoading, isError, error, refetch } = useFeedbackCycles();
  const createCycle = useCreateFeedbackCycle();
  const updateStatus = useUpdateFeedbackCycleStatus();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<CycleFormState>({
    name: "",
    type: "360",
    startDate: "",
    endDate: "",
    isAnonymous: true,
    questions: [{ id: randomId(), text: "", type: "rating" }],
  });

  const feedbackStartBounds = planningStartPickerProps();
  const feedbackEndBounds = planningEndPickerProps({
    startDate: form.startDate,
    mode: "after",
  });

  function handleStartDateChange(value: string) {
    setForm((prev) => ({
      ...prev,
      startDate: value,
      endDate: clearEndIfInvalid(value, prev.endDate, "after"),
    }));
  }

  function handleFormChange(field: keyof CycleFormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addQuestion() {
    setForm((prev) => ({
      ...prev,
      questions: [...prev.questions, { id: randomId(), text: "", type: "rating" }],
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
    const today = getTodayString();
    if (form.startDate < today || form.endDate < today) {
      toast.error("Cycle dates cannot be in the past");
      return;
    }
    if (isEndInvalidForStart(form.startDate, form.endDate, "after")) {
      toast.error("End date must be after start date");
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
        questions: [{ id: randomId(), text: "", type: "rating" }],
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
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-5 animate-pulse space-y-3">
            <div className="h-5 w-1/3 bg-muted rounded" />
            <div className="flex gap-2">
              <div className="h-5 w-16 bg-muted rounded-full" />
              <div className="h-5 w-16 bg-muted rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorState className="flex-1" title="Couldn't load feedback cycles" description={getErrorMessage(error)} onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <motion.div whileTap={{ scale: 0.97 }}>
              <AnimatedIconButton icon={PlusIcon} iconSize={16} iconClassName="mr-2">
                Create Cycle
              </AnimatedIconButton>
            </motion.div>
          </SheetTrigger>
          <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[480px]">
            <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left gap-1">
              <SheetTitle>Create Feedback Cycle</SheetTitle>
            </SheetHeader>
            <SheetBody className="space-y-4 px-6 py-5">
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
                  <DatePicker
                    value={form.startDate ?? ""}
                    onChange={handleStartDateChange}
                    placeholder="Pick a date"
                    className="text-sm"
                    fromDate={feedbackStartBounds.fromDate}
                    fromYear={feedbackStartBounds.fromYear}
                    toYear={feedbackStartBounds.toYear}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>End Date *</Label>
                  <DatePicker
                    value={form.endDate ?? ""}
                    onChange={(v) => handleFormChange("endDate", v)}
                    placeholder="Pick a date"
                    className="text-sm"
                    fromDate={feedbackEndBounds.fromDate}
                    fromYear={feedbackEndBounds.fromYear}
                    toYear={feedbackEndBounds.toYear}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.isAnonymous}
                  onCheckedChange={(v) => handleFormChange("isAnonymous", v)}
                />
                <Label className="cursor-pointer">Anonymous responses</Label>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Questions</Label>
                  <AnimatedIconButton type="button" icon={PlusIcon} iconSize={14} iconClassName="mr-1" size="sm" variant="outline" onClick={addQuestion}>
                    Add
                  </AnimatedIconButton>
                </div>
                {form.questions.map((q, idx) => (
                  <div key={q.id} className="bg-muted rounded-xl p-3 space-y-2 border border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Q{idx + 1}</span>
                      {form.questions.length > 1 && (
                        <RemoveQuestionButton onClick={() => removeQuestion(q.id)} />
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
                <LoadingButton
                  className="w-full"
                  onClick={handleCreate}
                  isPending={createCycle.isPending}
                  loadingText="Creating…"
                >
                  Create Cycle
                </LoadingButton>
              </motion.div>
            </SheetBody>
          </SheetContent>
        </Sheet>
      </div>

      {cycles.length === 0 ? (
        <EmptyState
          illustrationPreset="survey"
          title="No feedback cycles yet"
          className={CONTENT_FILL_PANEL}
        />
      ) : (
        <div className="space-y-3">
          {cycles.map((cycle, i) => (
            <motion.div
              key={cycle.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut", delay: i * 0.06 }}
              className="bg-card rounded-2xl border border-border shadow-sm p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{cycle.name}</h3>
                    <Badge className={`text-xs ${CYCLE_STATUS_STYLES[cycle.status] ?? "bg-muted text-muted-foreground"}`}>
                      {cycle.status}
                    </Badge>
                    <Badge className="text-xs bg-primary/10 text-foreground border-primary/30">{cycle.type}</Badge>
                    {cycle.isAnonymous && (
                      <Badge className="text-xs bg-muted text-muted-foreground">Anonymous</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(cycle.startDate).toLocaleDateString()} — {new Date(cycle.endDate).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">{cycle.questions.length} questions</p>
                </div>
                <div className="flex gap-2">
                  {cycle.status === "DRAFT" && (
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-gradient-success-from to-gradient-success-to hover:from-gradient-success-from hover:to-gradient-success-to text-white text-xs"
                      onClick={() => handleActivate(cycle)}
                    >
                      Activate
                    </Button>
                  )}
                  {cycle.status === "ACTIVE" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-muted-foreground"
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
