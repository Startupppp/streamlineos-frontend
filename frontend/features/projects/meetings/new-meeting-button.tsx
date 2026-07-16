"use client";

import { FileText, Zap } from "lucide-react";
import { PlusIcon, ChevronDownIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { MeetingType } from "@/types/projects";

export interface MeetingTemplate {
  type: MeetingType;
  label: string;
  duration: number;
  agenda: string;
}

export const MEETING_TEMPLATES: MeetingTemplate[] = [
  {
    type: "standup",
    label: "Daily Standup",
    duration: 15,
    agenda: "1. What did you do yesterday?\n2. What will you do today?\n3. Any blockers?",
  },
  {
    type: "planning",
    label: "Sprint Planning",
    duration: 60,
    agenda: "1. Review sprint goal\n2. Review backlog items\n3. Estimate and commit to tickets\n4. Clarify acceptance criteria",
  },
  {
    type: "review",
    label: "Sprint Review",
    duration: 60,
    agenda: "1. Demo completed work\n2. Gather stakeholder feedback\n3. Review sprint metrics\n4. Update product backlog",
  },
  {
    type: "retro",
    label: "Retrospective",
    duration: 60,
    agenda: "1. What went well?\n2. What could be improved?\n3. Action items for next sprint",
  },
  {
    type: "meeting",
    label: "1:1",
    duration: 30,
    agenda: "1. Updates and progress\n2. Blockers and support needed\n3. Goals for next period",
  },
  {
    type: "meeting",
    label: "Ad-hoc Meeting",
    duration: 30,
    agenda: "",
  },
];

interface NewMeetingButtonProps {
  onBlank: () => void;
  onTemplate: (tpl: MeetingTemplate) => void;
}

export function NewMeetingButton({ onBlank, onTemplate }: NewMeetingButtonProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1.5 text-xs" {...hoverHandlers}>
          <PlusIcon ref={iconRef} size={14} />
          New Meeting
          <ChevronDown className="ml-0.5 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onBlank}>
          <Zap className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
          Blank meeting
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {MEETING_TEMPLATES.map((tpl) => (
          <DropdownMenuItem key={tpl.label} onClick={() => onTemplate(tpl)}>
            <FileText className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            {tpl.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
