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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

function CreatePoolSheet() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createPool = useCreateTalentPool();

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
        <Button size="sm" className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          New Pool
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col p-0 gap-0">
        <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
          <SheetTitle className="text-base font-semibold">New Talent Pool</SheetTitle>
          <SheetDescription className="text-xs">Group candidates for future roles or ongoing sourcing.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80">
              Name<span className="text-rose-500 ml-0.5">*</span>
            </label>
            <Input placeholder="e.g. Future Engineers" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80">Description</label>
            <Textarea placeholder="What's this pool for?" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
        </div>
        <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
          <Button variant="outline" className="flex-1 h-9" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="flex-1 h-9" onClick={handleCreate} disabled={createPool.isPending}>
            {createPool.isPending ? "Creating…" : "Create Pool"}
          </Button>
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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
          <UserPlus className="h-3.5 w-3.5" />
          Add Candidate
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col p-0 gap-0">
        <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
          <SheetTitle className="text-base font-semibold">Add Candidate to Pool</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <Select value={candidateId} onValueChange={setCandidateId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a candidate" />
            </SelectTrigger>
            <SelectContent>
              {candidates?.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.firstName} {c.lastName} — {c.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
          <Button variant="outline" className="flex-1 h-9" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="flex-1 h-9" onClick={handleAdd} disabled={addMember.isPending}>
            {addMember.isPending ? "Adding…" : "Add"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function PoolMembersList({ poolId }: { poolId: number }) {
  const { data: members, isLoading } = usePoolMembers(poolId);
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

  if (isLoading) {
    return <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>;
  }

  if (!members?.length) {
    return <ChartEmptyState message="No candidates in this pool yet." height={160} compact />;
  }

  return (
    <div className="space-y-2">
      {members.map((m) => (
        <div key={m.membershipId} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{m.firstName} {m.lastName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{m.currentRole ?? m.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => handleRemove(m.candidateId)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}

export default function TalentPoolsPage() {
  const { data: pools, isLoading } = useTalentPools();
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

  return (
    <>
      <PageWrapper
        title="Talent Pools"
        subtitle="Passive candidate CRM — group and track talent outside active pipelines"
        badge={pools ? `${pools.length}` : undefined}
        actions={<CreatePoolSheet />}
      >
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
          </div>
        ) : isEmpty ? (
          <EmptyState
            illustrationPreset="projects"
            title="No talent pools yet"
            description="Create a pool to group candidates for future roles, campus hiring, or ongoing sourcing."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              {pools?.map((pool) => (
                <button
                  key={pool.id}
                  type="button"
                  onClick={() => setSelectedPoolId(pool.id)}
                  className={cn(
                    "w-full text-left rounded-2xl border p-4 transition-colors",
                    selectedPoolId === pool.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{pool.name}</p>
                    <Badge variant="secondary" className="text-[10px] shrink-0">{pool.memberCount}</Badge>
                  </div>
                  {pool.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{pool.description}</p>
                  )}
                </button>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(selectedPoolId)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <PoolMembersList poolId={selectedPoolId} />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                  <p className="text-xs text-muted-foreground">Select a pool to view its candidates.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </PageWrapper>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete this talent pool?"
        description="Candidates in this pool won't be deleted, only the pool grouping."
        confirmLabel={deletePool.isPending ? "Deleting…" : "Delete Pool"}
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}
