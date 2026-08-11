"use client";

import { useState, useCallback } from "react";
import { Users, Shield, Pencil, Settings2 } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { TablePagination } from "@/components/ui/table-pagination";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  RichPanel,
  RichSectionHeader,
} from "@/components/shared/rich-surface";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  usePrincipalGroups,
  useRenameGroup,
  type PrincipalGroup,
} from "@/hooks/api/principal-groups";
import { CreateGroupDialog } from "./create-group-dialog";
import { GroupDetailSheet } from "./group-detail-sheet";
import { createGroupSchema, type CreateGroupFormValues } from "./create-group-schema";

const PAGE_SIZE = 20;

function GroupsTableSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-12 rounded-lg" />
      ))}
    </div>
  );
}

interface RenameGroupDialogProps {
  group: PrincipalGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function RenameGroupDialog({ group, open, onOpenChange }: RenameGroupDialogProps) {
  const renameGroup = useRenameGroup(group?.id ?? "");
  const form = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { name: group?.name ?? "" },
    values: { name: group?.name ?? "" },
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) form.reset({ name: group?.name ?? "" });
    onOpenChange(next);
  };

  const onSubmit = (values: CreateGroupFormValues) => {
    renameGroup.mutate(values, {
      onSuccess: () => {
        toast.success("Group renamed");
        handleOpenChange(false);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename group</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoComplete="off"
                      className="h-9"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                isPending={renameGroup.isPending}
                loadingText="Saving…"
              >
                Save
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface GroupRowProps {
  group: PrincipalGroup;
  onRename: (group: PrincipalGroup) => void;
  onManage: (group: PrincipalGroup) => void;
}

function GroupRow({ group, onRename, onManage }: GroupRowProps) {
  const handleRename = useCallback(() => onRename(group), [group, onRename]);
  const handleManage = useCallback(() => onManage(group), [group, onManage]);

  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/40 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {group.name}
          </span>
          <Badge
            variant="outline"
            className="shrink-0 px-1.5 py-0 text-[10px] font-normal"
          >
            {group.kind === "ORG_UNIT" ? "Org unit" : "Custom"}
          </Badge>
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {group.memberCount}
          </span>
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            {group.roleCount}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {group.kind === "CUSTOM" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground"
            aria-label="Rename group"
            onClick={handleRename}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground"
          aria-label="Manage group"
          onClick={handleManage}
        >
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function GroupsPanel() {
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<PrincipalGroup | null>(null);
  const [detailTarget, setDetailTarget] = useState<PrincipalGroup | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data, isLoading, isError, error } = usePrincipalGroups({ page, limit: PAGE_SIZE });
  const groups = data?.data ?? [];
  const pagination = data?.pagination ?? { page, limit: PAGE_SIZE, total: 0, totalPages: 0 };

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleRename = useCallback((group: PrincipalGroup) => setRenameTarget(group), []);
  const handleManage = useCallback((group: PrincipalGroup) => {
    setDetailTarget(group);
    setDetailOpen(true);
  }, []);
  const handleRenameClose = useCallback((open: boolean) => {
    if (!open) setRenameTarget(null);
  }, []);
  const handleDetailClose = useCallback((open: boolean) => {
    if (!open) setDetailOpen(false);
  }, []);

  return (
    <>
      <RichPanel className="flex h-full min-h-0 flex-col">
        <RichSectionHeader
          title="Permission Groups"
          description="Assign roles to groups of members. Members inherit the group's roles."
          action={
            <AnimatedIconButton
              icon={PlusIcon}
              iconSize={14}
              iconClassName="mr-1.5"
              size="sm"
              onClick={handleOpenCreate}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              New group
            </AnimatedIconButton>
          }
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <GroupsTableSkeleton />
          ) : isError ? (
            <div className="flex flex-1 items-center justify-center py-8 text-sm text-destructive">
              {getErrorMessage(error)}
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-10 text-sm text-muted-foreground">
              No groups yet. Create one to assign roles to teams or departments.
            </div>
          ) : (
            <div className="space-y-0.5">
              {groups.map((group) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  onRename={handleRename}
                  onManage={handleManage}
                />
              ))}
            </div>
          )}
        </div>

        {pagination.total > PAGE_SIZE && (
          <TablePagination
            page={pagination.page}
            pageSize={pagination.limit}
            total={pagination.total}
            onPageChange={setPage}
            showPageNumbers={false}
          />
        )}
      </RichPanel>

      <CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} />
      <RenameGroupDialog
        group={renameTarget}
        open={!!renameTarget}
        onOpenChange={handleRenameClose}
      />
      <GroupDetailSheet
        group={detailTarget}
        open={detailOpen}
        onOpenChange={handleDetailClose}
      />
    </>
  );
}
