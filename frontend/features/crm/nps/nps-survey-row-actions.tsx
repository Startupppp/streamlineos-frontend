"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { CirclePlay, CircleStop, Eye, Link2, Pencil, Trash2 } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NpsSurveyStatus } from "@/hooks/api/crm/nps";
import type { NpsSurvey } from "@/hooks/api/crm/nps-surveys-schema";
import { writeToClipboard } from "@/lib/clipboard";
import { nextSurveyStatus, npsSurveyUrl, surveyLinkNotice } from "./nps-survey-status";

interface NpsSurveyRowActionsProps {
  survey: NpsSurvey;
  canManage: boolean;
  onViewResponses: (survey: NpsSurvey) => void;
  onEdit: (survey: NpsSurvey) => void;
  onSetStatus: (survey: NpsSurvey, status: NpsSurveyStatus) => void;
  onDelete: (survey: NpsSurvey) => void;
}

export function NpsSurveyRowActions({
  survey,
  canManage,
  onViewResponses,
  onEdit,
  onSetStatus,
  onDelete,
}: NpsSurveyRowActionsProps) {
  const next = nextSurveyStatus(survey.status);
  const notice = surveyLinkNotice(survey.status);

  const handleCopy = useCallback(async () => {
    const url = npsSurveyUrl(window.location.origin, survey.publicToken);
    if (!(await writeToClipboard(url))) {
      toast.error(`Couldn't copy. The link is ${url}`);
      return;
    }
    if (notice) toast.warning("Link copied", { description: notice });
    else toast.success("Link copied");
  }, [notice, survey.publicToken]);
  const handleView = useCallback(() => onViewResponses(survey), [onViewResponses, survey]);
  const handleEdit = useCallback(() => onEdit(survey), [onEdit, survey]);
  const handleStatus = useCallback(
    () => onSetStatus(survey, next.status),
    [next.status, onSetStatus, survey],
  );
  const handleDelete = useCallback(() => onDelete(survey), [onDelete, survey]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AnimatedIconButton
          icon={EllipsisIcon}
          iconSize={16}
          variant="ghost"
          size="icon"
          className="w-7"
          aria-label={`Actions for ${survey.title}`}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleView}>
          <Eye className="mr-2 h-3.5 w-3.5" />
          View responses
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopy}>
          <Link2 className="mr-2 h-3.5 w-3.5" />
          <span className="flex flex-col">
            Copy public link
            {notice ? <span className="text-xs text-muted-foreground">{notice}</span> : null}
          </span>
        </DropdownMenuItem>
        {canManage ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleStatus}>
              {next.status === "closed" ? (
                <CircleStop className="mr-2 h-3.5 w-3.5" />
              ) : (
                <CirclePlay className="mr-2 h-3.5 w-3.5" />
              )}
              {next.label}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleEdit}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
