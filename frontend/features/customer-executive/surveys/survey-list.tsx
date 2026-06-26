"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Star,
  Send,
  X,
  Trash2,
  Copy,
  BarChart3,
  MessageSquare,
  Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useUpdateCsatSurvey,
  useDeleteCsatSurvey,
  useCsatSurveyResponses,
  type CsatSurvey,
} from "@/lib/api/hooks/crm";
import { format } from "date-fns";
import { toast } from "sonner";

function StarDisplay({ rating, max }: { rating: number; max: number }) {
  return (
    <span className="text-amber-400">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i}>{i < rating ? "★" : "☆"}</span>
      ))}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "draft") return <Badge variant="secondary">Draft</Badge>;
  if (status === "sent")
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300">
        Sent
      </Badge>
    );
  return (
    <Badge className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300">
      Closed
    </Badge>
  );
}

interface ResultsSheetProps {
  survey: CsatSurvey;
  open: boolean;
  onClose: () => void;
}

function ResultsSheet({ survey, open, onClose }: ResultsSheetProps) {
  const { data: responses = [], isLoading } = useCsatSurveyResponses(
    open ? survey.id : 0
  );

  const distribution = Array.from({ length: survey.scaleMax }, (_, i) => {
    const val = i + 1;
    const count = responses.filter((r) => r.rating === val).length;
    return { val, count };
  });

  const avgRating =
    responses.length > 0
      ? responses.reduce((s, r) => s + r.rating, 0) / responses.length
      : null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="text-base">
            {survey.title} — Results
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-6">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="text-center">
                  <div className="text-5xl font-bold text-foreground">
                    {avgRating !== null ? avgRating.toFixed(1) : "—"}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    avg out of {survey.scaleMax} &middot; {responses.length}{" "}
                    response{responses.length !== 1 ? "s" : ""}
                  </div>
                  {avgRating !== null && (
                    <div className="mt-2 text-xl text-amber-400">
                      <StarDisplay
                        rating={Math.round(avgRating)}
                        max={survey.scaleMax}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Distribution
                  </p>
                  {distribution.map(({ val, count }) => (
                    <div key={val} className="flex items-center gap-3">
                      <span className="w-4 text-sm text-right text-muted-foreground">
                        {val}
                      </span>
                      <Progress
                        value={
                          responses.length > 0
                            ? (count / responses.length) * 100
                            : 0
                        }
                        className="flex-1 h-2"
                      />
                      <span className="w-6 text-sm text-muted-foreground text-right">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>

                {responses.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Responses
                    </p>
                    {responses.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-lg border bg-muted/30 p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">
                            {r.respondentName ?? "Anonymous"}
                            {r.respondentEmail && (
                              <span className="text-muted-foreground font-normal ml-1.5">
                                &lt;{r.respondentEmail}&gt;
                              </span>
                            )}
                          </div>
                          <StarDisplay rating={r.rating} max={survey.scaleMax} />
                        </div>
                        {r.comment && (
                          <p className="text-sm text-muted-foreground">
                            {r.comment}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          {format(
                            new Date(r.submittedAt),
                            "MMM d, yyyy 'at' h:mm a"
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {responses.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    No responses yet.
                  </p>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface SurveyRowProps {
  survey: CsatSurvey;
  onViewResults: (s: CsatSurvey) => void;
  onDelete: (s: CsatSurvey) => void;
}

function SurveyRow({ survey, onViewResults, onDelete }: SurveyRowProps) {
  const update = useUpdateCsatSurvey();

  const handleSend = useCallback(async () => {
    try {
      await update.mutateAsync({ id: survey.id, status: "sent" });
      toast.success("Survey sent");
    } catch {
      toast.error("Failed to send survey");
    }
  }, [survey.id, update]);

  const handleClose = useCallback(async () => {
    try {
      await update.mutateAsync({ id: survey.id, status: "closed" });
      toast.success("Survey closed");
    } catch {
      toast.error("Failed to close survey");
    }
  }, [survey.id, update]);

  const handleCopyLink = useCallback(() => {
    const link = `${window.location.origin}/surveys/${survey.id}?token=${survey.publicToken}`;
    void navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard");
  }, [survey.id, survey.publicToken]);

  const handleViewResults = useCallback(
    () => onViewResults(survey),
    [onViewResults, survey]
  );
  const handleDelete = useCallback(
    () => onDelete(survey),
    [onDelete, survey]
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="rounded-xl border bg-card p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-sm">{survey.title}</p>
            <StatusBadge status={survey.status} />
            {survey.client && (
              <span className="text-xs text-muted-foreground">
                {survey.client.name}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {survey.question}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-1 flex-wrap justify-end">
          {survey.status === "draft" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSend}
              disabled={update.isPending}
              className="h-7 text-xs gap-1"
            >
              <Send className="size-3" />
              Send
            </Button>
          )}
          {survey.status === "sent" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleClose}
              disabled={update.isPending}
              className="h-7 text-xs gap-1"
            >
              <X className="size-3" />
              Close
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleViewResults}
            className="h-7 text-xs gap-1"
          >
            <BarChart3 className="size-3" />
            Results
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyLink}
            aria-label="Copy survey link"
            className="h-7 w-7 p-0"
          >
            <Copy className="size-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            aria-label="Delete survey"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>Scale: 1–{survey.scaleMax}</span>
        <span className="flex items-center gap-1">
          <Users className="size-3" />
          {survey.responseCount ?? 0} response
          {(survey.responseCount ?? 0) !== 1 ? "s" : ""}
        </span>
        {survey.avgRating != null && (
          <span className="flex items-center gap-1 text-amber-500">
            <Star className="size-3 fill-amber-400" />
            {survey.avgRating.toFixed(1)}
          </span>
        )}
        <span>Created {format(new Date(survey.createdAt), "MMM d, yyyy")}</span>
      </div>
    </motion.div>
  );
}

interface SurveyListProps {
  surveys: CsatSurvey[];
  isLoading: boolean;
  resultsTarget: CsatSurvey | null;
  deleteTarget: CsatSurvey | null;
  onViewResults: (s: CsatSurvey) => void;
  onDelete: (s: CsatSurvey) => void;
  onCloseResults: () => void;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
  isDeleting: boolean;
}

export function SurveyList({
  surveys,
  isLoading,
  resultsTarget,
  deleteTarget,
  onViewResults,
  onDelete,
  onCloseResults,
  onCloseDelete,
  onConfirmDelete,
  isDeleting,
}: SurveyListProps) {
  const handleDeleteDialogChange = useCallback(
    (open: boolean) => {
      if (!open) onCloseDelete();
    },
    [onCloseDelete]
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (surveys.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <MessageSquare className="mx-auto mb-3 size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No surveys yet. Create your first CSAT survey.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {surveys.map((sv) => (
            <SurveyRow
              key={sv.id}
              survey={sv}
              onViewResults={onViewResults}
              onDelete={onDelete}
            />
          ))}
        </AnimatePresence>
      </div>

      {resultsTarget && (
        <ResultsSheet
          survey={resultsTarget}
          open={!!resultsTarget}
          onClose={onCloseResults}
        />
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete survey?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.title}&quot; and
              all its responses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
