import { useCallback } from "react";
import { toast } from "sonner";
import { Send, Pause, Lock, Archive, Copy, Users, Radio } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  const modeMeta = SURVEY_MODE_META[survey.mode];

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
      toast.success("Survey archived");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [archive, survey.id]);

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

  const isBusy = publish.isPending || pause.isPending || close.isPending || archive.isPending || duplicate.isPending;

  return (
    <div className="flex items-center gap-2">
      <SurveyStatusBadge status={survey.status} />
      <span className="text-xs text-muted-foreground">{modeMeta.label}</span>
      <div className="ml-auto flex items-center gap-2">
        {canViewParticipants && (
          <Button variant="outline" size="sm" asChild>
            <a href={`/surveys/${survey.id}/participants`}>
              <Users className="h-3.5 w-3.5" /> Participants & Share
            </a>
          </Button>
        )}
        {canPublish && (survey.status === "draft" || survey.status === "testing" || survey.status === "paused") && (
          <Button size="sm" onClick={handlePublish} disabled={isBusy}>
            <Send className="h-3.5 w-3.5" /> Publish
          </Button>
        )}
        {canPublish && survey.status === "published" && (
          <Button variant="outline" size="sm" onClick={handlePause} disabled={isBusy}>
            <Pause className="h-3.5 w-3.5" /> Pause
          </Button>
        )}
        {canHostLive && survey.mode === "live_session" && survey.status === "published" && (
          <Button size="sm" onClick={handleStartLiveSession} disabled={createLiveSession.isPending}>
            <Radio className="h-3.5 w-3.5" /> Start Live Session
          </Button>
        )}
        {(canCreate || canPublish || canDelete) && <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <AnimatedIconButton icon={EllipsisIcon} iconSize={16} variant="outline" size="icon" className="h-8 w-8" disabled={isBusy} aria-label="Survey actions" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canCreate && (
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="h-3.5 w-3.5" /> Duplicate
              </DropdownMenuItem>
            )}
            {canPublish && (survey.status === "published" || survey.status === "paused") && (
              <DropdownMenuItem onClick={handleClose}>
                <Lock className="h-3.5 w-3.5" /> Close
              </DropdownMenuItem>
            )}
            {canDelete && <DropdownMenuSeparator />}
            {canDelete && (
              <DropdownMenuItem onClick={handleArchive} variant="destructive">
                <Archive className="h-3.5 w-3.5" /> Archive
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>}
      </div>
    </div>
  );
}
