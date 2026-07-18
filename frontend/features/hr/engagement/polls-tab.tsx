"use client";

import { useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { BarChart3, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PlusIcon } from "@animateicons/react/lucide";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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

const pollSchema = z.object({
  question: z.string().trim().min(1, "Question is required").max(300, "Question must be at most 300 characters"),
  options: z
    .array(z.object({ value: z.string() }))
    .min(2, "At least 2 options are required")
    .max(10)
    .refine(
      (opts) => opts.filter((o) => o.value.trim().length > 0).length >= 2,
      "At least 2 non-empty options are required",
    ),
  closesAt: z.string().optional(),
  anonymous: z.boolean(),
});

type PollFormValues = z.infer<typeof pollSchema>;

const DEFAULT_VALUES: PollFormValues = {
  question: "",
  options: [{ value: "" }, { value: "" }],
  closesAt: "",
  anonymous: false,
};

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
    active: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
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
            className="text-[11px] gap-1 px-2"
            onClick={() => setShowResults((p) => !p)}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            {showResults ? "Hide" : "Results"}
          </Button>
          {canManage && (
            <Button
              size="sm"
              variant="ghost"
              className="text-[11px] px-2"
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
                  className="h-full rounded-full bg-primary transition-all duration-500"
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
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 text-xs text-left transition-colors"
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

  const form = useForm<PollFormValues>({
    resolver: zodResolver(pollSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });

  const handleReset = useCallback(() => {
    form.reset(DEFAULT_VALUES);
  }, [form]);

  const handleSheetChange = useCallback(
    (open: boolean) => {
      if (!open) handleReset();
      setSheetOpen(open);
    },
    [handleReset],
  );

  const handleCreate = useCallback(
    (data: PollFormValues) => {
      toast.promise(
        createPoll.mutateAsync({
          question: data.question,
          options: data.options.filter((o) => o.value.trim().length > 0).map((o) => o.value.trim()),
          anonymous: data.anonymous,
          closesAt: data.closesAt || undefined,
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
    },
    [createPoll, handleReset],
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={14}
            iconClassName="mr-1.5"
            size="sm"
            className="gap-1.5"
            onClick={() => setSheetOpen(true)}
          >
            New Poll
          </AnimatedIconButton>
        </div>
      )}

      {(!polls || polls.length === 0) ? (
        <EmptyState
          illustrationPreset="chart"
          title="No polls yet"
          description="Create a poll to gather quick feedback from the team"
          compact
        />
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
        onSubmit={form.handleSubmit(handleCreate)}
        submitLabel="Create Poll"
        isPending={createPoll.isPending}
      >
        <Form {...form}>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Question</FormLabel>
                  <FormControl>
                    <Input placeholder="Ask a question..." {...field} className="text-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel className="text-xs font-medium">Options</FormLabel>
              {fields.map((field, idx) => (
                <div key={field.id} className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name={`options.${idx}.value`}
                    render={({ field: inputField }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder={`Option ${idx + 1}`} {...inputField} className="text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {fields.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="w-8 shrink-0"
                      onClick={() => remove(idx)}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
              {fields.length < 10 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => append({ value: "" })}
                >
                  + Add option
                </Button>
              )}
            </div>

            <FormField
              control={form.control}
              name="closesAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Closes At (optional)</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} className="text-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="anonymous"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                    <div>
                      <FormLabel className="text-xs font-medium">Anonymous voting</FormLabel>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Voters remain hidden</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Form>
      </HrSheet>
    </div>
  );
}
