"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { resolveImageUrl } from "@/lib/utils";
import { useAddComment } from "@/lib/hooks/trpc-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

interface Comment {
  id: number;
  content?: string | null;
  createdAt?: Date | string | null;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    image?: string | null;
  } | null;
}

interface TicketCommentsProps {
  ticketId: number;
  comments: Comment[];
}

export function TicketComments({ ticketId, comments }: TicketCommentsProps) {
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");

  const addCommentMutation = useAddComment({
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(ticketId),
      });
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to add comment"),
  });

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    addCommentMutation.mutate({ ticketId, content: commentText.trim() });
  };

  return (
    <div className="pt-6 border-t">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Comments</h4>
        <Badge variant="secondary" className="text-xs">
          {comments.length}
        </Badge>
      </div>

      {/* Add comment form */}
      <div className="bg-muted/30 rounded-lg p-3 mb-4">
        <Textarea
          placeholder="Write a comment... (Ctrl+Enter to post)"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="min-h-[60px] resize-none border-0 bg-transparent focus-visible:ring-0 p-0 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
              handleAddComment();
          }}
        />
        <div className="flex justify-end mt-2">
          <Button
            size="sm"
            onClick={handleAddComment}
            disabled={!commentText.trim() || addCommentMutation.isPending}
            className="h-8"
          >
            {addCommentMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Send className="h-3 w-3 mr-1.5" />
                Post
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Comments list */}
      {comments.length > 0 && (
        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              <Avatar className="h-10 w-10 shrink-0 ring-2 ring-background">
                <AvatarImage src={resolveImageUrl(comment.user?.image)} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {comment.user?.firstName?.[0]}
                  {comment.user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">
                    {comment.user?.firstName} {comment.user?.lastName}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {comment.createdAt
                      ? format(
                          new Date(comment.createdAt),
                          "MMM d 'at' h:mm a"
                        )
                      : ""}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {comments.length === 0 && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          No comments yet. Be the first to comment!
        </div>
      )}
    </div>
  );
}
