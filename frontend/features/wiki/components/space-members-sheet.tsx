"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { UserCombobox } from "@/components/ui/user-combobox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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
import {
  useKbSpaceMembers,
  useAddKbSpaceMember,
  useRemoveKbSpaceMember,
} from "@/hooks/api/kb/spaces";
import type { KbSpaceMember } from "@/hooks/api/kb/spaces";
import { useCan } from "@/hooks/api/access";
import { KbUsersIcon } from "@/features/wiki/lib/kb-icons";
import { PageState } from "@/components/shared/page-state";
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

  function handleRemove() {
    remove.mutate(
      { spaceId, memberId: member.id },
      { onError: (e) => toast.error(getErrorMessage(e)) },
    );
  }

  return (
    <div className="flex items-center gap-3 py-2.5">
      <Avatar className="h-8 w-8 shrink-0">
        {member.userImage && <AvatarImage src={member.userImage} alt={name} />}
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
      <Badge variant="outline" className="text-micro h-5 px-2 shrink-0">
        {ROLE_LABEL[member.spaceRole] ?? member.spaceRole}
      </Badge>
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
              <FormLabel className="text-xs">Space role</FormLabel>
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SpaceMembersSheet({
  spaceId,
  spaceName,
  open,
  onOpenChange,
}: SpaceMembersSheetProps) {
  const canManage = useCan("kb:spaces:manage");
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
        <SheetBody className="px-6 py-4 flex-1 overflow-y-auto space-y-4">
          {canManage && <AddMemberForm spaceId={spaceId} />}
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
                illustration={
                  <KbUsersIcon className="w-8 text-muted-foreground" />
                }
                title="No members yet"
                description="Add members to this space to control who can access it."
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
          </PageState>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
