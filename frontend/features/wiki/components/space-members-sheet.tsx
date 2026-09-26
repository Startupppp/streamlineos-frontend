"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { useKbSpaceMembers } from "@/hooks/api/kb/spaces";
import type { KbSpaceMember } from "@/hooks/api/kb/spaces";
import { KbUsersIcon } from "@/features/wiki/lib/kb-icons";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCallback } from "react";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

function MemberRow({ member }: { member: KbSpaceMember }) {
  const name = getUserDisplayName({ name: member.userName, email: member.userEmail });
  const initials = getUserInitials({ name: member.userName, email: member.userEmail });

  return (
    <div className="flex items-center gap-3 py-2.5">
      <Avatar className="h-8 w-8 shrink-0">
        {member.userImage && <AvatarImage src={member.userImage} alt={name} />}
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{name}</p>
        {member.userEmail && (
          <p className="text-xs text-muted-foreground truncate">{member.userEmail}</p>
        )}
      </div>
      <Badge variant="outline" className="text-micro h-5 px-2 shrink-0">
        {ROLE_LABEL[member.spaceRole] ?? member.spaceRole}
      </Badge>
    </div>
  );
}

function MemberRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-5 w-14" />
    </div>
  );
}

interface SpaceMembersSheetProps {
  spaceId: number;
  spaceName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SpaceMembersSheet({
  spaceId,
  spaceName,
  open,
  onOpenChange,
}: SpaceMembersSheetProps) {
  const {
    data: members,
    isLoading,
    isError,
    error,
    refetch,
  } = useKbSpaceMembers(spaceId, { enabled: open });
  const membersState = usePageState({
    permission: "kb:spaces:manage",
    isLoading,
    isError,
    error,
    isEmpty: (members ?? []).length === 0,
  });

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-sm p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>Members — {spaceName}</SheetTitle>
        </SheetHeader>
        <SheetBody className="px-6 py-2 flex-1 overflow-y-auto">
          <PageState
            resolution={membersState}
            onRetry={handleRetry}
            compact
            loading={
              <div className="divide-y divide-border">
                {Array.from({ length: 5 }).map((_, i) => (
                  <MemberRowSkeleton key={i} />
                ))}
              </div>
            }
            empty={
              <EmptyState
                illustration={<KbUsersIcon className="w-8 text-muted-foreground" />}
                title="No members yet"
                description="Add members to this space to control who can access it."
              />
            }
          >
            <div className="divide-y divide-border">
              {(members ?? []).map((member) => (
                <MemberRow key={member.id} member={member} />
              ))}
            </div>
          </PageState>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
