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
import { getApiError } from "@/lib/api-client";
import {
  usePublishSurvey,
  usePauseSurvey,
  useCloseSurvey,
  useArchiveSurvey,
  useDuplicateSurvey,
  type SurveyForm,
} from "@/hooks/api/surveys/forms";
import { useCreateLiveSession } from "@/hooks/api/surveys/live-session";

export function SurveyBuilderHeader({ survey }: { survey: SurveyForm }) {
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
      toast.error(getApiError(error));
    }
  }, [publish, survey.id]);

  const handlePause = useCallback(async () => {
    try {
      await pause.mutateAsync(survey.id);
      toast.success("Survey paused");
    } catch (error) {
      toast.error(getApiError(error));
    }
  }, [pause, survey.id]);

  const handleClose = useCallback(async () => {
    try {
      await close.mutateAsync(survey.id);
      toast.success("Survey closed");
    } catch (error) {
      toast.error(getApiError(error));
    }
  }, [close, survey.id]);

  const handleArchive = useCallback(async () => {
    try {
      await archive.mutateAsync(survey.id);
      toast.success("Survey archived");
    } catch (error) {
      toast.error(getApiError(error));
    }
  }, [archive, survey.id]);

  const handleDuplicate = useCallback(async () => {
    try {
      const copy = await duplicate.mutateAsync(survey.id);
      toast.success("Survey duplicated");
      router.push(`/surveys/${copy.id}`);
    } catch (error) {
      toast.error(getApiError(error));
    }
  }, [duplicate, survey.id, router]);

  const handleStartLiveSession = useCallback(async () => {
    try {
      const session = await createLiveSession.mutateAsync();
      router.push(`/surveys/live/${session.id}/host`);
    } catch (error) {
      toast.error(getApiError(error));
    }
  }, [createLiveSession, router]);

  const isBusy = publish.isPending || pause.isPending || close.isPending || archive.isPending || duplicate.isPending;

  return (
    <div className="flex items-center gap-2">
      <SurveyStatusBadge status={survey.status} />
      <span className="text-xs text-muted-foreground">{modeMeta.label}</span>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href={`/surveys/${survey.id}/participants`}>
            <Users className="h-3.5 w-3.5" /> Participants & Share
          </a>
        </Button>
        {(survey.status === "draft" || survey.status === "testing" || survey.status === "paused") && (
          <Button size="sm" onClick={handlePublish} disabled={isBusy}>
            <Send className="h-3.5 w-3.5" /> Publish
          </Button>
        )}
        {survey.status === "published" && (
          <Button variant="outline" size="sm" onClick={handlePause} disabled={isBusy}>
            <Pause className="h-3.5 w-3.5" /> Pause
          </Button>
        )}
        {survey.mode === "live_session" && survey.status === "published" && (
          <Button size="sm" onClick={handleStartLiveSession} disabled={createLiveSession.isPending}>
            <Radio className="h-3.5 w-3.5" /> Start Live Session
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <AnimatedIconButton icon={EllipsisIcon} iconSize={16} variant="outline" size="icon" className="h-8 w-8" disabled={isBusy} aria-label="Survey actions" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDuplicate}>
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </DropdownMenuItem>
            {(survey.status === "published" || survey.status === "paused") && (
              <DropdownMenuItem onClick={handleClose}>
                <Lock className="h-3.5 w-3.5" /> Close
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleArchive} variant="destructive">
              <Archive className="h-3.5 w-3.5" /> Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
