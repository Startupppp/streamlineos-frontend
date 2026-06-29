"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoteKbArticle } from "@/hooks/api/kb";
import { getApiError } from "@/lib/api-client";
import { toast } from "sonner";

interface HelpfulVoteProps {
  articleId: number;
}

export function HelpfulVote({ articleId }: HelpfulVoteProps) {
  const vote = useVoteKbArticle();
  const [selected, setSelected] = useState<boolean | null>(null);

  function submitVote(helpful: boolean) {
    if (vote.isPending) return;
    setSelected(helpful);
    vote.mutate(
      { articleId, helpful },
      {
        onSuccess: () => toast.success("Thanks for your feedback!"),
        onError: (error) => {
          setSelected(null);
          toast.error(getApiError(error));
        },
      },
    );
  }

  function handleVoteUp() {
    submitVote(true);
  }

  function handleVoteDown() {
    submitVote(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-medium text-foreground">Was this helpful?</span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={selected === true ? "default" : "outline"}
          size="sm"
          onClick={handleVoteUp}
          disabled={vote.isPending}
          aria-pressed={selected === true}
        >
          <ThumbsUp className="h-4 w-4 mr-1" /> Yes
        </Button>
        <Button
          type="button"
          variant={selected === false ? "default" : "outline"}
          size="sm"
          onClick={handleVoteDown}
          disabled={vote.isPending}
          aria-pressed={selected === false}
        >
          <ThumbsDown className="h-4 w-4 mr-1" /> No
        </Button>
      </div>
    </div>
  );
}
