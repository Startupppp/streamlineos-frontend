"use client";

import { useState, memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn, resolveImageUrl } from "@/lib/utils";
import { INLINE_POPOVER_MIN_CLASS } from "@/components/ui/field-control";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateTicket } from "@/hooks/api/build/tickets";
import { useProjectMembers } from "@/hooks/api/build/projects";
import {
  getUserDisplayName,
  getUserInitials,
} from "@/lib/person-display";
import { User, Check } from "lucide-react";
import { InlineFieldWrapper } from "./card-field-wrapper";
import { usePresenceMap } from "@/hooks/api/chat-core-read";
import { AvatarWithPresence } from "@/components/shared/presence-dot";

interface InlineAssigneeProps {
  ticketId: number;
  projectId: number;
  currentAssigneeId?: string | null;
  assignee?: {
    id: string;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    image?: string | null;
  } | null;
}

export const InlineAssignee = memo(function InlineAssignee({
  ticketId,
  projectId,
  currentAssigneeId,
  assignee,
}: InlineAssigneeProps) {
  const [open, setOpen] = useState(false);
  const { data: members = [] } = useProjectMembers(projectId);
  const updateTicket = useUpdateTicket(projectId, {
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const presenceMap = usePresenceMap();

  function makeAssigneeHandler(userId: string | null) {
    return function selectAssignee() {
      if (userId === null) {
        updateTicket.mutate({ ticketId, assigneeIds: [] });
      } else {
        updateTicket.mutate({ ticketId, assigneeId: userId });
      }
      setOpen(false);
    };
  }

  const trigger = assignee ? (
    <AvatarWithPresence
      src={resolveImageUrl(assignee.image)}
      fallback={getUserInitials(assignee)}
      status={presenceMap.get(assignee.id)}
      avatarClassName="h-5 w-5 border border-background cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
    />
  ) : (
    <div className="h-5 w-5 rounded-full bg-muted border border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0 cursor-pointer hover:border-muted-foreground/60 transition-colors">
      <span className="text-micro text-muted-foreground">?</span>
    </div>
  );

  return (
    <InlineFieldWrapper>
      <ResponsivePopover open={open} onOpenChange={setOpen}>
        <ResponsivePopoverTrigger asChild>
          <button type="button" aria-label="Change assignee">
            {trigger}
          </button>
        </ResponsivePopoverTrigger>
        <ResponsivePopoverContent
          title="Assignee"
          className={cn("p-0", INLINE_POPOVER_MIN_CLASS, "min-w-52")}
          align="end"
        >
          <Command>
            <CommandInput placeholder="Search members..." className="text-xs" />
            <CommandList className="max-h-48">
              <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">
                No members found.
              </CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__unassigned__"
                  onSelect={makeAssigneeHandler(null)}
                >
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-xs">Unassigned</span>
                  {!currentAssigneeId && <Check className="ml-auto h-3 w-3" />}
                </CommandItem>
                {members.map((m) => (
                  <CommandItem
                    key={m.id}
                    value={getUserDisplayName(m)}
                    onSelect={makeAssigneeHandler(m.id)}
                  >
                    <Avatar className="mr-2 h-5 w-5 shrink-0">
                      <AvatarImage src={resolveImageUrl(m.image)} />
                      <AvatarFallback className="text-micro">
                        {getUserInitials(m)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-left text-xs">
                      {getUserDisplayName(m)}
                    </span>
                    {m.id === currentAssigneeId && (
                      <Check className="ml-auto h-3 w-3 shrink-0" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </ResponsivePopoverContent>
      </ResponsivePopover>
    </InlineFieldWrapper>
  );
});
