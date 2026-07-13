"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, BarChart3, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { HrSheet } from "@/features/hr/hr-sheet";
import {
  useEngagementPolls,
  useCreatePoll,
  useVotePoll,
  usePollResults,
  useUpdatePoll,
  type HrPoll,
} from "@/hooks/api/hr/engagement";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";

function PollCard({
  poll,
  canManage,
}: {
  poll: HrPoll;
  canManage: boolean;
}) {
  const [showResults, setShowResults] = useState(false);
  const [voted, setVoted] = useState(false);
  const { data: results } = usePollResults(showResults ? poll.id : 0);
  const vote = useVotePoll();
  const updatePoll = useUpdatePoll();

  const handleVote = useCallback(
    (optionIndex: number) => {
      toast.promise(vote.mutateAsync({ pollId: poll.id, optionIndex }), {
        loading: "Voting...",
        success: () => {
          setVoted(true);
          setShowResults(true);
          return "Vote recorded!";
        },
        error: getErrorMessage,
      });
    },
    [poll.id, vote],
  );

  const handleToggleStatus = useCallback(() => {
    const nextStatus = poll.status === "active" ? "closed" : "active";
    toast.promise(updatePoll.mutateAsync({ id: poll.id, status: nextStatus }), {
      loading: "Updating poll...",
      success: "Poll updated",
      error: getErrorMessage,
    });
  }, [poll.id, poll.status, updatePoll]);

  const STATUS_COLORS: Record<HrPoll["status"], string> = {
    draft: "bg-muted text-muted-foreground border-border",
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    closed: "bg-muted text-muted-foreground border-border",
  };

  const maxCount = results ? Math.max(...results.counts.map((c) => c.count), 1) : 1;

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground leading-snug">{poll.question}</p>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                STATUS_COLORS[poll.status]
              }`}
            >
              {poll.status}
            </span>
            {poll.anonymous && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                Anonymous
              </Badge>
            )}
          </div>
          {poll.closesAt && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Closes {new Date(poll.closesAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[11px] gap-1 px-2"
            onClick={() => setShowResults((p) => !p)}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            {showResults ? "Hide" : "Results"}
          </Button>
          {canManage && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[11px] px-2"
              onClick={handleToggleStatus}
              disabled={updatePoll.isPending}
            >
              {poll.status === "active" ? "Close" : "Activate"}
            </Button>
          )}
        </div>
      </div>

      {showResults && results ? (
        <div className="space-y-2">
          {results.counts.map((c) => (
            <div key={c.optionIndex} className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground">{c.option}</span>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {c.count} ({results.totalVotes > 0 ? Math.round((c.count / results.totalVotes) * 100) : 0}%)
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${(c.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground">{results.totalVotes} total votes</p>
        </div>
      ) : (
        poll.status === "active" && !voted && (
          <div className="flex flex-col gap-1.5">
            {poll.options.map((option, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleVote(idx)}
                disabled={vote.isPending}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-blue-400 hover:bg-blue-50 text-xs text-left transition-colors"
              >
                <Vote className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {option}
              </button>
            ))}
          </div>
        )
      )}
    </div>
  );
}

export function PollsTab() {
  const { data: polls, isLoading } = useEngagementPolls();
  const canManage = useCan("hr:engagement:manage");
  const createPoll = useCreatePoll();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [anonymous, setAnonymous] = useState(false);
  const [closesAt, setClosesAt] = useState("");

  const handleQuestionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuestion(e.target.value);
  }, []);

  const handleOptionChange = useCallback((idx: number, val: string) => {
    setOptions((prev) => prev.map((o, i) => (i === idx ? val : o)));
  }, []);

  const handleAddOption = useCallback(() => setOptions((prev) => [...prev, ""]), []);

  const handleRemoveOption = useCallback(
    (idx: number) => setOptions((prev) => prev.filter((_, i) => i !== idx)),
    [],
  );

  const handleClosesAtChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setClosesAt(e.target.value);
  }, []);

  const handleReset = useCallback(() => {
    setQuestion("");
    setOptions(["", ""]);
    setAnonymous(false);
    setClosesAt("");
  }, []);

  const handleSheetChange = useCallback(
    (open: boolean) => {
      if (!open) handleReset();
      setSheetOpen(open);
    },
    [handleReset],
  );

  const handleCreate = useCallback(() => {
    const validOptions = options.filter((o) => o.trim().length > 0);
    if (!question.trim() || validOptions.length < 2) {
      toast.error("Question and at least 2 options required");
      return;
    }
    toast.promise(
      createPoll.mutateAsync({
        question,
        options: validOptions,
        anonymous,
        closesAt: closesAt || undefined,
      }),
      {
        loading: "Creating poll...",
        success: () => {
          setSheetOpen(false);
          handleReset();
          return "Poll created!";
        },
        error: getErrorMessage,
      },
    );
  }, [question, options, anonymous, closesAt, createPoll, handleReset]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setSheetOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            New Poll
          </Button>
        </div>
      )}

      {(!polls || polls.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-lg border border-dashed border-border bg-muted/20">
          <BarChart3 className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">No polls yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} canManage={canManage} />
          ))}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetChange}
        title="Create Poll"
        description="Ask your team a quick question."
        onSubmit={handleCreate}
        submitLabel="Create Poll"
        isPending={createPoll.isPending}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="poll-q" className="text-xs font-medium">Question</Label>
            <Input
              id="poll-q"
              placeholder="Ask a question..."
              value={question}
              onChange={handleQuestionChange}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Options</Label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  placeholder={`Option ${idx + 1}`}
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  className="h-8 text-sm flex-1"
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => handleRemoveOption(idx)}
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={handleAddOption}
              >
                + Add option
              </Button>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="poll-closes" className="text-xs font-medium">Closes At (optional)</Label>
            <Input
              id="poll-closes"
              type="datetime-local"
              value={closesAt}
              onChange={handleClosesAtChange}
              className="h-9 text-sm"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
            <div>
              <p className="text-xs font-medium">Anonymous voting</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Voters remain hidden</p>
            </div>
            <Switch checked={anonymous} onCheckedChange={setAnonymous} />
          </div>
        </div>
      </HrSheet>
    </div>
  );
}
