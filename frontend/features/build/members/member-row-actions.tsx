"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { EllipsisIcon } from "@animateicons/react/lucide";
import type { BuildMember } from "@/hooks/api/build/build-members";

interface MemberActionsProps {
  member: BuildMember;
  onRemove: (member: BuildMember) => void;
}

export function MemberActions({ member, onRemove }: MemberActionsProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  function handleRemoveSelect() {
    onRemove(member);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          aria-label="Member actions"
          {...hoverHandlers}
        >
          <EllipsisIcon ref={iconRef} size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem variant="destructive" onSelect={handleRemoveSelect}>
          Remove from workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
