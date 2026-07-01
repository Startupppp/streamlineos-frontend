"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { MessageSquare, Plus, X, Star, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  useMyPendingReviews,
  useSubmitFeedbackResponse,
  useFeedbackResults,
  type FeedbackCycle,
  type FeedbackCycleRequest,
} from "@/hooks/api/hr";

const CYCLE_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  ACTIVE: "bg-green-100 text-green-700",
  CLOSED: "bg-blue-100 text-blue-700",
  ARCHIVED: "bg-violet-100 text-violet-700",
};

const RELATIONSHIP_COLORS: Record<string, string> = {
  PEER: "bg-blue-100 text-blue-700",
  MANAGER: "bg-violet-100 text-violet-700",
  DIRECT_REPORT: "bg-amber-100 text-amber-700",
  SELF: "bg-slate-100 text-slate-600",
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

interface ReviewAnswers {
  [questionId: string]: { rating?: number; text?: string };
}

function CyclesTab() {
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
              <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200">
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
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md"
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

function MyReviewsTab() {
  const { data: reviews = [], isLoading } = useMyPendingReviews();
  const submitFeedback = useSubmitFeedbackResponse();
  const { data: cycles = [] } = useFeedbackCycles();

  const [reviewingRequest, setReviewingRequest] = useState<FeedbackCycleRequest | null>(null);
  const [answers, setAnswers] = useState<ReviewAnswers>({});
  const [overallRating, setOverallRating] = useState(0);

  function handleOpenReview(req: FeedbackCycleRequest) {
    setReviewingRequest(req);
    setAnswers({});
    setOverallRating(0);
  }

  function getCycleQuestions(cycleId: number) {
    return cycles.find((c) => c.id === cycleId)?.questions ?? [];
  }

  async function handleSubmitReview() {
    if (!reviewingRequest) return;
    const responses = Object.entries(answers).map(([questionId, ans]) => ({
      questionId,
      rating: ans.rating,
      text: ans.text,
    }));
    try {
      await submitFeedback.mutateAsync({
        requestId: reviewingRequest.id,
        responses,
        overallRating: overallRating || undefined,
      });
      toast.success("Review submitted");
      setReviewingRequest(null);
    } catch {
      toast.error("Failed to submit review");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white/90 rounded-2xl border border-slate-200/80 p-5 animate-pulse space-y-2">
            <div className="h-4 w-1/2 bg-slate-200 rounded" />
            <div className="h-3 w-1/3 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <MessageSquare className="w-12 h-12 text-slate-300" />
        <p className="text-slate-500 font-medium">No pending reviews</p>
        <p className="text-sm">You&apos;re all caught up!</p>
      </div>
    );
  }

  const currentQuestions = reviewingRequest ? getCycleQuestions(reviewingRequest.cycleId) : [];

  return (
    <>
      <div className="space-y-3">
        {reviews.map((req, i) => (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut", delay: i * 0.06 }}
            className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-5 flex items-center justify-between gap-4"
          >
            <div className="space-y-2">
              <p className="font-medium text-slate-800">
                Review for <span className="text-violet-600">{req.subjectId}</span>
              </p>
              <div className="flex gap-2 flex-wrap">
                <Badge className={`text-xs ${RELATIONSHIP_COLORS[req.relationship] ?? "bg-slate-100 text-slate-600"}`}>
                  {req.relationship}
                </Badge>
                <Badge className={`text-xs ${req.status === "PENDING" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                  {req.status}
                </Badge>
              </div>
            </div>
            {req.status === "PENDING" && (
              <Button
                size="sm"
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs shadow-md"
                onClick={() => handleOpenReview(req)}
              >
                Submit Review
              </Button>
            )}
          </motion.div>
        ))}
      </div>

      <Dialog open={!!reviewingRequest} onOpenChange={(open) => !open && setReviewingRequest(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit Feedback</DialogTitle>
          </DialogHeader>
          {reviewingRequest && (
            <div className="space-y-5 pt-2">
              <p className="text-sm text-slate-600">
                For: <span className="font-medium text-slate-800">{reviewingRequest.subjectId}</span>
              </p>
              {currentQuestions.map((q, idx) => (
                <div key={q.id} className="space-y-2">
                  <Label className="text-sm">
                    Q{idx + 1}: {q.text}
                  </Label>
                  {q.type === "rating" ? (
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() =>
                            setAnswers((prev) => ({
                              ...prev,
                              [q.id]: { ...prev[q.id], rating: star },
                            }))
                          }
                          className="transition-colors"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              (answers[q.id]?.rating ?? 0) >= star
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-300"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Input
                      placeholder="Your response…"
                      value={answers[q.id]?.text ?? ""}
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [q.id]: { ...prev[q.id], text: e.target.value },
                        }))
                      }
                    />
                  )}
                </div>
              ))}
              <div className="space-y-2">
                <Label>Overall Rating</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setOverallRating(star)}>
                      <Star
                        className={`w-6 h-6 ${
                          overallRating >= star ? "fill-amber-400 text-amber-400" : "text-slate-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md"
                  onClick={handleSubmitReview}
                  disabled={submitFeedback.isPending}
                >
                  {submitFeedback.isPending ? "Submitting…" : "Submit Feedback"}
                </Button>
              </motion.div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ResultsTab() {
  const [subjectId, setSubjectId] = useState("");
  const [searched, setSearched] = useState("");

  const { data: results, isLoading, isError } = useFeedbackResults(searched);

  function handleSearch() {
    setSearched(subjectId.trim());
  }

  const completionPct =
    results && results.totalRequests > 0
      ? Math.round((results.completedRequests / results.totalRequests) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Enter employee ID…"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch} variant="outline">
          Search
        </Button>
      </div>

      {!searched && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <Search className="w-12 h-12 text-slate-300" />
          <p className="text-slate-500 font-medium">Select an employee to view 360° feedback results</p>
          <p className="text-sm">Enter an employee ID above</p>
        </div>
      )}

      {searched && isLoading && (
        <div className="bg-white/90 rounded-2xl border border-slate-200/80 p-8 animate-pulse space-y-4">
          <div className="h-5 w-1/3 bg-slate-200 rounded" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}
          </div>
        </div>
      )}

      {searched && isError && (
        <div className="bg-white/90 rounded-2xl border border-red-200 p-6 text-center text-red-500">
          No results found for this employee
        </div>
      )}

      {results && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-6 space-y-5"
        >
          <h3 className="font-semibold text-slate-800">Results for {results.subjectId}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-slate-800">{results.totalRequests}</p>
              <p className="text-xs text-slate-500 mt-1">Total Requests</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{results.completedRequests}</p>
              <p className="text-xs text-slate-500 mt-1">Completed</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-violet-600">
                {results.avgRating !== undefined ? results.avgRating.toFixed(1) : "—"}
              </p>
              <p className="text-xs text-slate-500 mt-1">Avg Rating</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">{completionPct}%</p>
              <p className="text-xs text-slate-500 mt-1">Completion</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Completion rate</span>
              <span>{completionPct}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-700"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/40 p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <h1 className="text-2xl font-bold text-slate-900">360° Feedback</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage feedback cycles and review submissions</p>
      </motion.div>

      <Tabs defaultValue="cycles">
        <TabsList className="bg-white/80 border border-slate-200/80">
          <TabsTrigger value="cycles">Cycles</TabsTrigger>
          <TabsTrigger value="reviews">My Reviews</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value="cycles" className="mt-6">
            <CyclesTab />
          </TabsContent>
          <TabsContent value="reviews" className="mt-6">
            <MyReviewsTab />
          </TabsContent>
          <TabsContent value="results" className="mt-6">
            <ResultsTab />
          </TabsContent>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}
