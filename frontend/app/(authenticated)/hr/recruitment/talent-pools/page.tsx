"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useTalentPools,
  useCreateTalentPool,
  useDeleteTalentPool,
  usePoolMembers,
  useAddPoolMember,
  useRemovePoolMember,
} from "@/hooks/api/hr/recruitment";
import { useCandidates } from "@/hooks/api/hr/recruitment";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger, SheetBody } from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PlusIcon, TrashIcon, UserPlusIcon, XIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import { ErrorState } from "@/components/shared/error-state";

function CreatePoolSheet() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createPool = useCreateTalentPool();

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) { setName(e.target.value); }
  function handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) { setDescription(e.target.value); }
  function handleCancel() { setOpen(false); }

  const handleCreate = useCallback(() => {
    if (!name.trim()) {
      toast.error("Pool name is required");
      return;
    }
    createPool.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Talent pool created");
          setOpen(false);
          setName("");
          setDescription("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [name, description, createPool]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <AnimatedIconButton icon={PlusIcon} iconSize={14} size="sm" className="gap-1.5">
          New Pool
        </AnimatedIconButton>
      </SheetTrigger>
      <SheetContent className="flex flex-col p-0 gap-0">
        <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
          <SheetTitle className="text-base font-semibold">New Talent Pool</SheetTitle>
          <SheetDescription className="text-xs">Group candidates for future roles or ongoing sourcing.</SheetDescription>
        </SheetHeader>
        <SheetBody className="px-4 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80">
              Name<span className="text-status-danger-ink ml-0.5">*</span>
            </label>
            <Input placeholder="e.g. Future Engineers" value={name} onChange={handleNameChange} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80">Description</label>
            <Textarea placeholder="What's this pool for?" value={description} onChange={handleDescriptionChange} rows={3} />
          </div>
        </SheetBody>
        <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
          <Button variant="outline" className="flex-1 h-9" onClick={handleCancel}>Cancel</Button>
          <LoadingButton className="flex-1 h-9" onClick={handleCreate} isPending={createPool.isPending} loadingText="Creating…">
            Create Pool
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function AddMemberSheet({ poolId }: { poolId: number }) {
  const [open, setOpen] = useState(false);
  const [candidateId, setCandidateId] = useState("");
  const { data: candidates } = useCandidates();
  const addMember = useAddPoolMember(poolId);

  const handleAdd = useCallback(() => {
    if (!candidateId) {
      toast.error("Select a candidate");
      return;
    }
    addMember.mutate(
      { candidateId: Number(candidateId) },
      {
        onSuccess: () => {
          toast.success("Candidate added to pool");
          setOpen(false);
          setCandidateId("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [candidateId, addMember]);

  function handleCancel() { setOpen(false); }
  function handleCandidateChange(v: string) { setCandidateId(v); }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <AnimatedIconButton icon={UserPlusIcon} iconSize={14} variant="outline">
          Add Candidate
        </AnimatedIconButton>
      </SheetTrigger>
      <SheetContent className="flex flex-col p-0 gap-0">
        <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
          <SheetTitle className="text-base font-semibold">Add Candidate to Pool</SheetTitle>
        </SheetHeader>
        <SheetBody className="px-4 py-4 space-y-4">
          <Select value={candidateId} onValueChange={handleCandidateChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a candidate" />
            </SelectTrigger>
            <SelectContent>
              {candidates?.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.firstName} {c.lastName} — {c.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SheetBody>
        <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
          <Button variant="outline" className="flex-1 h-9" onClick={handleCancel}>Cancel</Button>
          <LoadingButton className="flex-1 h-9" onClick={handleAdd} isPending={addMember.isPending} loadingText="Adding…">
            Add
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface PoolButtonProps {
  pool: { id: number; name: string; memberCount: number; description?: string | null };
  isSelected: boolean;
  onSelect: (id: number) => void;
}

function PoolButton({ pool, isSelected, onSelect }: PoolButtonProps) {
  function handleClick() { onSelect(pool.id); }
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "w-full text-left rounded-2xl border p-4 transition-colors",
        isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{pool.name}</p>
        <Badge variant="secondary" className="text-micro shrink-0">{pool.memberCount}</Badge>
      </div>
      {pool.description && (
        <TruncatedText text={pool.description} lines={2} className="text-xs text-muted-foreground mt-1" />
      )}
    </button>
  );
}

interface PoolMemberRowProps {
  member: { membershipId: number; candidateId: number; firstName: string; lastName: string; currentRole?: string | null; email?: string | null };
  onRemove: (candidateId: number) => void;
}

function PoolMemberRow({ member: m, onRemove }: PoolMemberRowProps) {
  function handleRemoveClick() { onRemove(m.candidateId); }
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
      <div className="min-w-0">
        <TruncatedText text={`${m.firstName} ${m.lastName}`} className="text-sm font-medium text-foreground" />
        <TruncatedText text={m.currentRole ?? m.email ?? ""} className="text-dense text-muted-foreground" />
      </div>
      <TooltipIconButton
        icon={XIcon}
        label={`Remove ${m.firstName} ${m.lastName} from pool`}
        className="w-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={handleRemoveClick}
      />
    </div>
  );
}

function PoolMembersList({ poolId }: { poolId: number }) {
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([undefined]);
  const page = cursorHistory.length;
  const cursor = cursorHistory.at(-1);
  const { data: membersData, isLoading, isFetching } = usePoolMembers(poolId, { cursor, limit: 20 });
  const members = membersData?.data;
  const pagination = membersData?.pagination;
  const removeMember = useRemovePoolMember(poolId);

  const handleRemove = useCallback(
    (candidateId: number) => {
      removeMember.mutate(candidateId, {
        onSuccess: () => toast.success("Removed from pool"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [removeMember],
  );

  const handlePreviousPage = useCallback(() => {
    setCursorHistory((history) => history.length > 1 ? history.slice(0, -1) : history);
  }, []);

  const handleNextPage = useCallback(() => {
    const nextCursor = pagination?.nextCursor;
    if (nextCursor) setCursorHistory((history) => [...history, nextCursor]);
  }, [pagination?.nextCursor]);

  if (isLoading) {
    return <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>;
  }

  if (!members?.length) {
    return <ChartEmptyState message="No candidates in this pool yet." height={160} compact />;
  }

  return (
    <div className="space-y-2">
      {members.map((m) => (
        <PoolMemberRow key={m.membershipId} member={m} onRemove={handleRemove} />
      ))}
      {pagination && (page > 1 || pagination.hasMore) && (
        <CursorPageControls
          page={page}
          hasNext={pagination.hasMore}
          disabled={isFetching}
          onPrevious={handlePreviousPage}
          onNext={handleNextPage}
        />
      )}
    </div>
  );
}

export default function TalentPoolsPage() {
  const { data: pools, isLoading, isError, refetch } = useTalentPools();
  const deletePool = useDeleteTalentPool();
  const [selectedPoolId, setSelectedPoolId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deletePool.mutate(deleteTarget, {
      onSuccess: () => {
        toast.success("Pool deleted");
        if (selectedPoolId === deleteTarget) setSelectedPoolId(null);
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteTarget, deletePool, selectedPoolId]);

  const isEmpty = !isLoading && (!pools || pools.length === 0);

  function handleSelectPool(poolId: number) { setSelectedPoolId(poolId); }
  function handleDeleteSelectedPool() { if (selectedPoolId !== null) setDeleteTarget(selectedPoolId); }
  function handleCloseDeleteDialog(open: boolean) { if (!open) setDeleteTarget(null); }
  function handleRetry() { void refetch(); }

  return (
    <>
      <PageWrapper
        title="Talent Pools"
        subtitle="Passive candidate CRM — group and track talent outside active pipelines"
        actions={<CreatePoolSheet />}
      >
        {isLoading ? (
          <div className="flex flex-1 min-h-0 flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
            </div>
          </div>
        ) : isError ? (
          <ErrorState
            title="Unable to load talent pools"
            description="Try again. If this keeps happening, check your permissions or contact an admin."
            onRetry={handleRetry}
          />
        ) : isEmpty ? (
          <RecruitmentEmptyState
            illustrationPreset="projects"
            title="No talent pools yet"
            description="Create a pool to group candidates for future roles, campus hiring, or ongoing sourcing."
          />
        ) : (
          <div className="flex flex-1 min-h-0 flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              {pools?.map((pool) => (
                <PoolButton
                  key={pool.id}
                  pool={pool}
                  isSelected={selectedPoolId === pool.id}
                  onSelect={handleSelectPool}
                />
              ))}
            </div>

            <div className="lg:col-span-2">
              {selectedPoolId ? (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-foreground">
                      {pools?.find((p) => p.id === selectedPoolId)?.name}
                    </h2>
                    <div className="flex items-center gap-2">
                      <AddMemberSheet poolId={selectedPoolId} />
                      <TooltipIconButton
                        icon={TrashIcon}
                        label="Delete pool"
                        className="w-8 text-muted-foreground hover:text-destructive"
                        onClick={handleDeleteSelectedPool}
                      />
                    </div>
                  </div>
                  <PoolMembersList key={selectedPoolId} poolId={selectedPoolId} />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                  <p className="text-xs text-muted-foreground">Select a pool to view its candidates.</p>
                </div>
              )}
            </div>
          </div>
          </div>
        )}
      </PageWrapper>

      <ConfirmSheet
        open={deleteTarget !== null}
        onOpenChange={handleCloseDeleteDialog}
        title="Delete this talent pool?"
        description="Candidates in this pool won't be deleted, only the pool grouping."
        confirmLabel="Delete Pool"
        destructive
        isPending={deletePool.isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
