"use client";

import { Component, useCallback, type ReactNode } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { Input } from "@/components/ui/input";
import { UserCombobox } from "@/components/ui/user-combobox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { getErrorMessage } from "@/lib/get-error-message";
import { resolveImageUrl } from "@/lib/utils";
import {
  useKbSpaceMembers,
  useAddKbSpaceMember,
  useRemoveKbSpaceMember,
  useUpdateKbSpaceMemberRole,
} from "@/hooks/api/kb/spaces";
import type { KbSpaceMember } from "@/hooks/api/kb/kb-spaces-settings-schema";
import { useCan } from "@/hooks/api/access";
import { KbUsersIcon } from "@/features/wiki/lib/kb-icons";
import { PageState } from "@/components/shared/page-state";
import { ErrorState } from "@/components/shared/error-state";
import { usePageState } from "@/hooks/api/use-page-state";
import {
  addMemberSchema,
  type AddMemberFormValues,
} from "./space-members-schema";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
  commenter: "Commenter",
  publisher: "Publisher",
};

interface MemberRowProps {
  member: KbSpaceMember;
  canManage: boolean;
  spaceId: number;
}

const ROLE_VALUES = ["viewer", "commenter", "editor", "publisher", "admin"] as const;

function MemberRow({ member, canManage, spaceId }: MemberRowProps) {
  const name = getUserDisplayName({
    name: member.userName,
    email: member.userEmail,
  });
  const initials = getUserInitials({
    name: member.userName,
    email: member.userEmail,
  });
  const remove = useRemoveKbSpaceMember();
  const updateRole = useUpdateKbSpaceMemberRole();

  function handleRemove() {
    remove.mutate(
      { spaceId, memberId: member.id },
      { onError: (e) => toast.error(getErrorMessage(e)) },
    );
  }

  function handleRoleChange(value: string) {
    const spaceRole = ROLE_VALUES.find((r) => r === value);
    if (!spaceRole) return;
    updateRole.mutate(
      { spaceId, memberId: member.id, spaceRole },
      { onError: (e) => toast.error(getErrorMessage(e)) },
    );
  }

  return (
    <div className="flex items-center gap-3 py-2.5">
      <Avatar className="h-8 w-8 shrink-0">
        {member.userImage && <AvatarImage src={resolveImageUrl(member.userImage)} alt={name} />}
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{name}</p>
        {member.userEmail && (
          <p className="text-xs text-muted-foreground truncate">
            {member.userEmail}
          </p>
        )}
      </div>
      {canManage ? (
        <Select value={member.spaceRole} onValueChange={handleRoleChange} disabled={updateRole.isPending}>
          <SelectTrigger className="h-7 w-28 text-xs shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_VALUES.map((r) => (
              <SelectItem key={r} value={r} className="text-xs">
                {ROLE_LABEL[r] ?? r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Badge variant="outline" className="text-micro h-5 px-2 shrink-0">
          {ROLE_LABEL[member.spaceRole] ?? member.spaceRole}
        </Badge>
      )}
      {canManage && (
        <LoadingButton
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          aria-label={`Remove ${name}`}
          isPending={remove.isPending}
          onClick={handleRemove}
        >
          <Trash2 className="h-4 w-4" />
        </LoadingButton>
      )}
    </div>
  );
}

function MemberRowSkeleton() {
  return (
    <div className="flex min-w-0 items-center gap-3 py-2.5">
      <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-32 max-w-full" />
        <Skeleton className="h-3 w-full" />
      </div>
      <Skeleton className="h-5 w-14 shrink-0" />
    </div>
  );
}

interface AddMemberFormProps {
  spaceId: number;
}

function AddMemberForm({ spaceId }: AddMemberFormProps) {
  const addMember = useAddKbSpaceMember();
  const form = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { userId: "", role: "", spaceRole: "viewer" },
  });

  function handleSubmit(values: AddMemberFormValues) {
    const userId = (values.userId ?? "").trim() || undefined;
    const role = (values.role ?? "").trim() || undefined;
    addMember.mutate(
      { spaceId, spaceRole: values.spaceRole, userId, role },
      {
        onSuccess: () => {
          toast.success("Member added");
          form.reset();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-3 pb-4 border-b"
      >
        <p className="text-sm font-medium text-foreground">Add member</p>
        <FormField
          control={form.control}
          name="userId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Member</FormLabel>
              <FormControl>
                <UserCombobox
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Select member…"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Role slug</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g. engineer"
                  className="h-9 text-sm"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="spaceRole"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Team folder role</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="commenter">Commenter</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="publisher">Publisher</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <LoadingButton
          type="submit"
          size="sm"
          className="w-full"
          isPending={addMember.isPending}
          loadingText="Adding…"
        >
          Add member
        </LoadingButton>
      </form>
    </Form>
  );
}

interface SpaceMembersSheetProps {
  spaceId: number;
  spaceName: string;
  canManageFolder: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

class MembersReadBoundary extends Component<
  { children: ReactNode; onReset: () => void },
  { error: unknown | null }
> {
  state: { error: unknown | null } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  render() {
    if (this.state.error !== null) {
      return (
        <ErrorState
          compact
          description={getErrorMessage(this.state.error)}
          error={this.state.error}
          onRetry={() => {
            this.props.onReset();
            this.setState({ error: null });
          }}
        />
      );
    }
    return this.props.children;
  }
}

function MembersRead({
  spaceId,
  open,
  canManage,
}: {
  spaceId: number;
  open: boolean;
  canManage: boolean;
}) {
  const {
    data: members,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useKbSpaceMembers(spaceId, { enabled: open });
  const membersState = usePageState({
    permission: "kb:spaces:view",
    isLoading,
    isError,
    error,
    isEmpty: (members ?? []).length === 0,
  });

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  return (
    <div className="space-y-4">
      {canManage && (membersState.kind === "ready" || membersState.kind === "empty") && <AddMemberForm spaceId={spaceId} />}
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
            description="Add members to this team folder to control who can access it."
          />
        }
      >
        <div className="divide-y divide-border">
          {(members ?? []).map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              canManage={canManage}
              spaceId={spaceId}
            />
          ))}
        </div>
        <InfiniteScrollSentinel
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={handleLoadMore}
          label="Load more members"
        />
      </PageState>
    </div>
  );
}

export function SpaceMembersSheet({
  spaceId,
  spaceName,
  canManageFolder,
  open,
  onOpenChange,
}: SpaceMembersSheetProps) {
  const canManage = useCan("kb:spaces:view") && canManageFolder;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-sm gap-0 p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>Members — {spaceName}</SheetTitle>
          <SheetDescription className="text-xs mt-0.5">
            People who can read or edit files in this team folder.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="flex-1 overflow-y-auto px-6 py-4">
          <QueryErrorResetBoundary>
            {({ reset }) => (
              <MembersReadBoundary key={spaceId} onReset={reset}>
                <MembersRead spaceId={spaceId} open={open} canManage={canManage} />
              </MembersReadBoundary>
            )}
          </QueryErrorResetBoundary>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
