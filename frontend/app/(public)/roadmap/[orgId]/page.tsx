"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowBigUp,
  Loader2,
  MessageSquarePlus,
  Sparkles,
  Megaphone,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptySprintIllustration } from "@/components/illustrations";
import { toast } from "sonner";
import { randomId } from "@/lib/random-id";
import {
  usePublicRoadmap,
  usePublicVote,
  useSubmitPublicFeedback,
  type PublicRoadmapItem,
  type PublicFeedbackPost,
  type PublicChangelogEntry,
  type ChangelogType,
} from "@/hooks/api/build/roadmap";

const VOTER_KEY_STORAGE = "streamlineos:roadmap:voterKey";

const COLUMNS: {
  key: "planned" | "in_progress" | "completed";
  label: string;
}[] = [
  { key: "planned", label: "Planned" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

const CHANGELOG_TYPE_LABEL: Record<ChangelogType, string> = {
  feature: "Feature",
  improvement: "Improvement",
  fix: "Fix",
};

const CHANGELOG_TYPE_VARIANT: Record<
  ChangelogType,
  "default" | "secondary" | "outline"
> = {
  feature: "default",
  improvement: "secondary",
  fix: "outline",
};

function useVoterKey() {
  const [voterKey, setVoterKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      const existing = window.localStorage.getItem(VOTER_KEY_STORAGE);
      if (existing) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVoterKey(existing);
        return;
      }
      const generated = randomId();
      window.localStorage.setItem(VOTER_KEY_STORAGE, generated);
      setVoterKey(generated);
    } catch {
      setVoterKey(randomId());
    }
  }, []);

  return voterKey;
}

function RoadmapColumnCard({
  item,
  votedIds,
  onVote,
  isVoting,
}: {
  item: PublicRoadmapItem;
  votedIds: Set<string>;
  onVote: (id: number) => void;
  isVoting: boolean;
}) {
  const voted = votedIds.has(`roadmap:${item.id}`);
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => onVote(item.id)}
            disabled={voted || isVoting}
            aria-label="Upvote"
            className="flex flex-col items-center justify-center rounded-md border px-2 py-1 shrink-0 transition-colors disabled:opacity-60 enabled:hover:border-primary enabled:hover:text-primary"
          >
            <ArrowBigUp className="h-4 w-4" />
            <span className="text-sm font-semibold tabular-nums">
              {item.votes}
            </span>
          </button>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium leading-snug">{item.title}</p>
            {item.description && (
              <p className="text-xs text-muted-foreground line-clamp-3">
                {item.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              {item.targetQuarter && (
                <Badge variant="outline" className="text-micro">
                  {item.targetQuarter}
                </Badge>
              )}
              {item.category && (
                <Badge variant="secondary" className="text-micro">
                  {item.category}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FeedbackCard({
  post,
  votedIds,
  onVote,
  isVoting,
}: {
  post: PublicFeedbackPost;
  votedIds: Set<string>;
  onVote: (id: number) => void;
  isVoting: boolean;
}) {
  const voted = votedIds.has(`feedback:${post.id}`);
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => onVote(post.id)}
            disabled={voted || isVoting}
            aria-label="Upvote"
            className="flex flex-col items-center justify-center rounded-md border px-2 py-1 shrink-0 transition-colors disabled:opacity-60 enabled:hover:border-primary enabled:hover:text-primary"
          >
            <ArrowBigUp className="h-4 w-4" />
            <span className="text-sm font-semibold tabular-nums">
              {post.votes}
            </span>
          </button>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium leading-snug">{post.title}</p>
            {post.description && (
              <p className="text-xs text-muted-foreground line-clamp-3">
                {post.description}
              </p>
            )}
            {post.category && (
              <Badge variant="secondary" className="text-micro">
                {post.category}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChangelogCard({ entry }: { entry: PublicChangelogEntry }) {
  return (
    <Card>
      <CardContent className="p-3 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium">{entry.title}</p>
          <Badge
            variant={CHANGELOG_TYPE_VARIANT[entry.type]}
            className="text-micro"
          >
            {CHANGELOG_TYPE_LABEL[entry.type]}
          </Badge>
          {entry.version && (
            <Badge variant="outline" className="text-micro">
              {entry.version}
            </Badge>
          )}
        </div>
        {entry.content && (
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">
            {entry.content}
          </p>
        )}
        {entry.publishedAt && (
          <p className="text-dense text-muted-foreground">
            {format(new Date(entry.publishedAt), "MMMM d, yyyy")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function FeedbackForm({
  orgId,
  voterKey,
}: {
  orgId: string;
  voterKey: string | null;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const submit = useSubmitPublicFeedback(orgId);

  const handleSubmit = useCallback(() => {
    if (!title.trim()) return;
    submit.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        name: name.trim() || undefined,
        email: email.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Thanks! Your feedback was submitted.");
          setTitle("");
          setDescription("");
          setName("");
          setEmail("");
        },
        onError: () => toast.error("Failed to submit feedback"),
      },
    );
  }, [title, description, name, email, submit]);

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquarePlus className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Submit feedback</h2>
        </div>
        <div className="space-y-1">
          <Label>Title *</Label>
          <Input
            placeholder="What would you like to see?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!voterKey || submit.isPending}
          />
        </div>
        <div className="space-y-1">
          <Label>Details</Label>
          <Textarea
            rows={3}
            placeholder="Describe your idea or problem"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!voterKey || submit.isPending}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              placeholder="Optional"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!voterKey || submit.isPending}
            />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="Optional"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!voterKey || submit.isPending}
            />
          </div>
        </div>
        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={!voterKey || submit.isPending || !title.trim()}
        >
          {submit.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
            </>
          ) : (
            "Submit feedback"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function PublicRoadmapPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;
  const voterKey = useVoterKey();
  const { data, isLoading, isError, refetch } = usePublicRoadmap(orgId);
  const vote = usePublicVote(orgId);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => data?.roadmap, [data]);

  const handleVote = useCallback(
    (type: "roadmap" | "feedback", id: number) => {
      if (!voterKey) return;
      const marker = `${type}:${id}`;
      setVotedIds((prev) => {
        const next = new Set(prev);
        next.add(marker);
        return next;
      });
      vote.mutate(
        { type, id, voterKey },
        {
          onSuccess: (result) => {
            if (result.voted) toast.success("Thanks for your vote!");
          },
          onError: () => {
            toast.error("Failed to register vote");
            setVotedIds((prev) => {
              const next = new Set(prev);
              next.delete(marker);
              return next;
            });
          },
        },
      );
    },
    [voterKey, vote],
  );

  const handleRoadmapVote = useCallback(
    (id: number) => handleVote("roadmap", id),
    [handleVote],
  );

  const handleFeedbackVote = useCallback(
    (id: number) => handleVote("feedback", id),
    [handleVote],
  );

  return (
    <main className="min-h-dvh surface-soft">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
        <header className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 text-primary mb-2">
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Product Roadmap
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {data?.orgName ?? "Roadmap"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            See what we&apos;re building, vote on ideas and request features.
          </p>
        </header>

        {isLoading ? (
          <LoadingState variant="cards" rows={9} />
        ) : isError ? (
          <ErrorState
            title="Roadmap unavailable"
            description="This roadmap board could not be loaded. Please check the link and try again."
            onRetry={() => refetch()}
          />
        ) : !data ? (
          <EmptyState
            illustration={<EmptySprintIllustration />}
            title="No roadmap available"
            className="flex-1"
          />
        ) : (
          <div className="space-y-10">
            <section>
              <div className="grid gap-4 md:grid-cols-3">
                {COLUMNS.map((col) => {
                  const items: PublicRoadmapItem[] = grouped
                    ? grouped[col.key]
                    : [];
                  return (
                    <div key={col.key} className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {col.label}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {items.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {items.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border/60 py-8 text-center text-xs text-muted-foreground">
                            Nothing here yet
                          </div>
                        ) : (
                          items.map((item) => (
                            <RoadmapColumnCard
                              key={item.id}
                              item={item}
                              votedIds={votedIds}
                              onVote={handleRoadmapVote}
                              isVoting={vote.isPending}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground">
                  Feature requests
                </h2>
                <FeedbackForm orgId={orgId} voterKey={voterKey} />
                <div className="space-y-2">
                  {data.feedback.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-1">
                      No feature requests yet. Be the first to submit one.
                    </p>
                  ) : (
                    data.feedback.map((post) => (
                      <FeedbackCard
                        key={post.id}
                        post={post}
                        votedIds={votedIds}
                        onVote={handleFeedbackVote}
                        isVoting={vote.isPending}
                      />
                    ))
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">
                    Changelog
                  </h2>
                </div>
                <div className="space-y-2">
                  {data.changelog.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-1">
                      No updates published yet.
                    </p>
                  ) : (
                    data.changelog.map((entry) => (
                      <ChangelogCard key={entry.id} entry={entry} />
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
