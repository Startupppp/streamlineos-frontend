import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Send, Pause, Lock, Archive, Copy, Users, Radio } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MobileOnlyLabelTooltip,
  RESPONSIVE_ICON_LABEL_TRIGGER_CLASS,
  ResponsiveIconLabelText,
} from "@/components/ui/responsive-icon-label";
import { cn } from "@/lib/utils";
import { SurveyActivityMenuSection } from "@/features/surveys/builder/survey-activity-panel";
import { SurveyStatusBadge } from "@/features/surveys/list/survey-status-badge";
import { SURVEY_MODE_META } from "@/features/surveys/shared/survey-mode-meta";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  usePublishSurvey,
  usePauseSurvey,
  useCloseSurvey,
  useArchiveSurvey,
  useDuplicateSurvey,
  type SurveyForm,
} from "@/hooks/api/surveys/forms";
import { useCreateLiveSession } from "@/hooks/api/surveys/live-session";
import { useCan } from "@/hooks/api/access";

export function SurveyBuilderHeader({ survey }: { survey: SurveyForm }) {
  const canViewParticipants = useCan("surveys:participants:view");
  const canPublish = useCan("surveys:publish");
  const canDelete = useCan("surveys:delete");
  const canCreate = useCan("surveys:create");
  const canHostLive = useCan("surveys:live:host");
  const router = useRouter();
  const publish = usePublishSurvey();
  const pause = usePauseSurvey();
  const close = useCloseSurvey();
  const archive = useArchiveSurvey();
  const duplicate = useDuplicateSurvey();
  const createLiveSession = useCreateLiveSession(survey.id);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);

  const modeMeta = SURVEY_MODE_META[survey.mode];
  const canArchive = canDelete && survey.status !== "archived";
  const canPublishNow =
    canPublish &&
    (survey.status === "draft" || survey.status === "testing" || survey.status === "paused");
  const canPauseNow = canPublish && survey.status === "published";
  const canStartLive =
    canHostLive && survey.mode === "live_session" && survey.status === "published";

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

  const handleRequestArchive = useCallback(() => setConfirmArchiveOpen(true), []);

  const handleDuplicate = useCallback(async () => {
    try {
      const copy = await duplicate.mutateAsync(survey.id);
      toast.success("Survey duplicated");
      router.push(`/surveys/${copy.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [duplicate, survey.id, router]);

  const handleStartLiveSession = useCallback(async () => {
    try {
      const session = await createLiveSession.mutateAsync();
      router.push(`/surveys/live/${session.id}/host`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [createLiveSession, router]);

  const isBusy =
    publish.isPending ||
    pause.isPending ||
    close.isPending ||
    archive.isPending ||
    duplicate.isPending;

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <SurveyStatusBadge status={survey.status} />
        <span className="truncate text-sm text-muted-foreground">{modeMeta.label}</span>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:ml-auto">
        {canViewParticipants ? (
          <MobileOnlyLabelTooltip label="Participants & Share" always side="top">
            <Button variant="outline" size="icon" className="size-9 shrink-0" asChild>
              <a href={`/surveys/${survey.id}/participants`} aria-label="Participants & Share">
                <Users className="size-4" aria-hidden="true" />
              </a>
            </Button>
          </MobileOnlyLabelTooltip>
        ) : null}
        {canPublishNow ? (
          <MobileOnlyLabelTooltip label="Publish">
            <Button
              size="sm"
              className={cn(RESPONSIVE_ICON_LABEL_TRIGGER_CLASS, "bg-primary text-primary-foreground hover:bg-primary/90")}
              onClick={handlePublish}
              disabled={isBusy}
              aria-label="Publish"
            >
              <Send className="size-4" aria-hidden="true" />
              <ResponsiveIconLabelText>Publish</ResponsiveIconLabelText>
            </Button>
          </MobileOnlyLabelTooltip>
        ) : null}
        {canPauseNow ? (
          <MobileOnlyLabelTooltip label="Pause">
            <Button
              variant="outline"
              size="sm"
              className={cn(RESPONSIVE_ICON_LABEL_TRIGGER_CLASS, "bg-card")}
              onClick={handlePause}
              disabled={isBusy}
              aria-label="Pause"
            >
              <Pause className="size-4" aria-hidden="true" />
              <ResponsiveIconLabelText>Pause</ResponsiveIconLabelText>
            </Button>
          </MobileOnlyLabelTooltip>
        ) : null}
        {canStartLive ? (
          <MobileOnlyLabelTooltip label="Start live session">
            <Button
              size="sm"
              className={cn(RESPONSIVE_ICON_LABEL_TRIGGER_CLASS, "bg-primary text-primary-foreground hover:bg-primary/90")}
              onClick={handleStartLiveSession}
              disabled={createLiveSession.isPending}
              aria-label="Start live session"
            >
              <Radio className="size-4" aria-hidden="true" />
              <ResponsiveIconLabelText>Live</ResponsiveIconLabelText>
            </Button>
          </MobileOnlyLabelTooltip>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <AnimatedIconButton
              icon={EllipsisIcon}
              iconSize={16}
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              disabled={isBusy}
              aria-label="Survey actions"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <SurveyActivityMenuSection survey={survey} />
            {(canCreate || canPublish || canArchive) && <DropdownMenuSeparator />}
            {canCreate && (
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="size-4" />
                Duplicate
              </DropdownMenuItem>
            )}
            {canPublish && (survey.status === "published" || survey.status === "paused") && (
              <DropdownMenuItem onClick={handleClose}>
                <Lock className="size-4" />
                Close
              </DropdownMenuItem>
            )}
            {canArchive && (canCreate || canPublish) && <DropdownMenuSeparator />}
            {canArchive && (
              <DropdownMenuItem onClick={handleRequestArchive} variant="destructive">
                <Archive className="size-4" />
                Archive
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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
      </div>
    </div>
  );
}
