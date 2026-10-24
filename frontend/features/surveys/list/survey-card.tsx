"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Archive,
  Copy,
  ExternalLink,
  Lock,
  MoreHorizontal,
  Pause,
  Send,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TruncatedText } from "@/components/ui/truncated-text";
import { SurveyStatusBadge } from "./survey-status-badge";
import { SURVEY_MODE_META } from "@/features/surveys/shared/survey-mode-meta";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useArchiveSurvey,
  useCloseSurvey,
  useDuplicateSurvey,
  usePauseSurvey,
  usePublishSurvey,
  type SurveyForm,
} from "@/hooks/api/surveys/forms";

export function SurveyCard({ survey }: { survey: SurveyForm }) {
  const modeMeta = SURVEY_MODE_META[survey.mode];
  const ModeIcon = modeMeta.icon;
  const canViewParticipants = useCan("surveys:participants:view");
  const canPublish = useCan("surveys:publish");
  const canDelete = useCan("surveys:delete");
  const canCreate = useCan("surveys:create");
  const publish = usePublishSurvey();
  const pause = usePauseSurvey();
  const close = useCloseSurvey();
  const archive = useArchiveSurvey();
  const duplicate = useDuplicateSurvey();
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);

  const canArchive = canDelete && survey.status !== "archived";
  const canPublishNow =
    canPublish &&
    (survey.status === "draft" || survey.status === "testing" || survey.status === "paused");
  const canPauseNow = canPublish && survey.status === "published";
  const canCloseNow =
    canPublish && (survey.status === "published" || survey.status === "paused");
  const showMenu = canCreate || canPublishNow || canPauseNow || canCloseNow || canArchive;
  const isBusy =
    publish.isPending ||
    pause.isPending ||
    close.isPending ||
    archive.isPending ||
    duplicate.isPending;

  const href = `/surveys/${survey.id}`;
  const participantsHref = `/surveys/${survey.id}/participants`;

  const handlePublish = useCallback(async () => {
    try {
      await publish.mutateAsync(survey.id);
      toast.success("Survey published");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [publish, survey.id]);

  const handlePause = useCallback(async () => {
    try {
      await pause.mutateAsync(survey.id);
      toast.success("Survey paused");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [pause, survey.id]);

  const handleClose = useCallback(async () => {
    try {
      await close.mutateAsync(survey.id);
      toast.success("Survey closed");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [close, survey.id]);

  const handleArchive = useCallback(async () => {
    try {
      await archive.mutateAsync(survey.id);
      setConfirmArchiveOpen(false);
      toast.success("Survey archived");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [archive, survey.id]);

  const handleDuplicate = useCallback(async () => {
    try {
      await duplicate.mutateAsync(survey.id);
      toast.success("Survey duplicated");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [duplicate, survey.id]);

  return (
    <Card className="h-full transition-colors hover:border-primary/40 hover:bg-muted/20">
      <CardHeader className="has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
            <ModeIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle as="h3" className="min-w-0 text-sm font-semibold leading-snug">
              <Link
                href={href}
                className="text-foreground outline-none transition-colors hover:text-primary focus-visible:underline"
              >
                <TruncatedText text={survey.title} className="font-semibold" />
              </Link>
            </CardTitle>
            <CardDescription className="text-sm">{modeMeta.label}</CardDescription>
          </div>
        </div>
        <CardAction>
          <SurveyStatusBadge status={survey.status} />
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        {survey.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{survey.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground">No description yet</p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="font-medium uppercase tracking-wide">{survey.defaultLanguage}</span>
          <span aria-hidden="true">·</span>
          <span>Updated {formatDistanceToNow(new Date(survey.updatedAt), { addSuffix: true })}</span>
        </div>
      </CardContent>

      <CardFooter className="mt-auto gap-2 border-t border-border/60">
        <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
          <Link href={href}>
            <ExternalLink className="size-4" aria-hidden="true" />
            Open
          </Link>
        </Button>
        {canViewParticipants ? (
          <Button type="button" variant="ghost" size="sm" className="gap-1.5" asChild>
            <Link href={participantsHref}>
              <Users className="size-4" aria-hidden="true" />
              Share
            </Link>
          </Button>
        ) : null}
        {canPublishNow ? (
          <Button
            type="button"
            size="sm"
            className="ml-auto gap-1.5"
            onClick={handlePublish}
            disabled={isBusy}
          >
            <Send className="size-4" aria-hidden="true" />
            Publish
          </Button>
        ) : null}
        {canPauseNow ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto gap-1.5"
            onClick={handlePause}
            disabled={isBusy}
          >
            <Pause className="size-4" aria-hidden="true" />
            Pause
          </Button>
        ) : null}
        {showMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={canPublishNow || canPauseNow ? undefined : "ml-auto"}
                disabled={isBusy}
                aria-label={`Actions for ${survey.title}`}
              >
                <MoreHorizontal className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {canCreate ? (
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="size-4" />
                  Duplicate
                </DropdownMenuItem>
              ) : null}
              {canCloseNow ? (
                <DropdownMenuItem onClick={handleClose}>
                  <Lock className="size-4" />
                  Close
                </DropdownMenuItem>
              ) : null}
              {canArchive ? <DropdownMenuSeparator /> : null}
              {canArchive ? (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setConfirmArchiveOpen(true)}
                >
                  <Archive className="size-4" />
                  Archive
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </CardFooter>

      <ConfirmDialog
        open={confirmArchiveOpen}
        onOpenChange={setConfirmArchiveOpen}
        title="Archive this survey?"
        description="Its links stop accepting responses. Existing responses and results are kept."
        confirmLabel="Archive survey"
        destructive
        isPending={archive.isPending}
        keepOpenOnConfirm
        onConfirm={handleArchive}
      />
    </Card>
  );
}
