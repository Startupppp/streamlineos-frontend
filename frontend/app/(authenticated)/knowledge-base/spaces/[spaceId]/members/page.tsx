"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { AddMemberDialog, SPACE_ROLE_LABELS } from "@/components/kb/add-member-dialog";
import {
  useKbSpace,
  useKbSpaceMembers,
  useRemoveKbSpaceMember,
} from "@/lib/api/hooks/kb";
import { getApiError } from "@/lib/api-client";
import type { KbSpaceMember } from "@/types/kb";

function getInitials(name: string | null, email: string | null): string {
  const source = name ?? email ?? "?";
  return source.slice(0, 2).toUpperCase();
}

interface MemberAccessRowProps {
  member: KbSpaceMember;
  isRemoving: boolean;
  onRemove: (memberId: number) => void;
}

function MemberAccessRow({ member, isRemoving, onRemove }: MemberAccessRowProps) {
  const handleConfirmRemove = () => onRemove(member.id);
  const isUserGrant = member.userId !== null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
      {isUserGrant ? (
        <>
          <Avatar>
            <AvatarImage src={member.userImage ?? undefined} alt={member.userName ?? ""} />
            <AvatarFallback className="text-xs">
              {getInitials(member.userName, member.userEmail)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {member.userName ?? member.userEmail ?? "Unknown user"}
            </p>
            {member.userEmail && (
              <p className="truncate text-xs text-muted-foreground">{member.userEmail}</p>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <ShieldCheck className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <Badge variant="outline">Role: {member.role ?? "Unknown"}</Badge>
          </div>
        </>
      )}

      <Badge variant="secondary" className="shrink-0">
        {SPACE_ROLE_LABELS[member.spaceRole]}
      </Badge>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            disabled={isRemoving}
            aria-label="Remove access"
          >
            <Trash2 className="size-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove access?</AlertDialogTitle>
            <AlertDialogDescription>
              This revokes the access rule from the space. You can add it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function KnowledgeBaseSpaceMembersPage() {
  const { spaceId: spaceIdParam } = useParams<{ spaceId: string }>();
  const spaceId = Number(spaceIdParam);

  const [addOpen, setAddOpen] = useState(false);

  const spaceQuery = useKbSpace(spaceId);
  const membersQuery = useKbSpaceMembers(spaceId);
  const removeMember = useRemoveKbSpaceMember(spaceId);

  const members = membersQuery.data ?? [];
  const spaceHref = `/knowledge-base/spaces/${spaceId}`;

  const handleOpenAdd = () => setAddOpen(true);

  const handleRetry = () => {
    membersQuery.refetch();
  };

  const handleRemove = (memberId: number) => {
    removeMember.mutate(memberId, {
      onSuccess: () => toast.success("Access removed"),
      onError: (error) => toast.error(getApiError(error)),
    });
  };

  return (
    <PageWrapper
      eyebrow="Knowledge Base"
      title="Members & access"
      subtitle={
        spaceQuery.data
          ? `Manage who can access ${spaceQuery.data.name}`
          : "Manage who can access this space"
      }
      actions={
        <>
          <Button asChild variant="outline" size="sm">
            <Link href={spaceHref}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back to space
            </Link>
          </Button>
          <Button size="sm" onClick={handleOpenAdd}>
            <Plus className="mr-1 h-4 w-4" /> Add access
          </Button>
        </>
      }
    >
      {membersQuery.isLoading ? (
        <LoadingState variant="list" />
      ) : membersQuery.isError ? (
        <ErrorState
          title="Unable to load access rules"
          description={getApiError(membersQuery.error)}
          onRetry={handleRetry}
        />
      ) : members.length === 0 ? (
        <EmptyState
          title="No access rules yet"
          description="Grant a user or role access to control who can view and edit this space."
          action={{ label: "Add access", onClick: handleOpenAdd }}
        />
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <MemberAccessRow
              key={member.id}
              member={member}
              isRemoving={removeMember.isPending && removeMember.variables === member.id}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}

      <AddMemberDialog spaceId={spaceId} open={addOpen} onOpenChange={setAddOpen} />
    </PageWrapper>
  );
}
