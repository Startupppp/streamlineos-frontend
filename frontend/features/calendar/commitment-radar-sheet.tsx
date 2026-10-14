"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCalendarCommitmentChain, useCreateCalendarCommitmentEdge, useRemoveCalendarCommitmentEdge } from "@/hooks/api/calendar-commitments";
import { useCan } from "@/hooks/api/access";
import type { CommitmentChainNode, CommitmentReference } from "@/hooks/api/calendar-commitment-schema";

function ChainNode({ node, depth, onRemove }: { node: CommitmentChainNode; depth: number; onRemove: (id: string, version: number) => void }) {
  return (
    <li className="space-y-2 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={node.href} className="font-medium text-primary hover:underline">{node.title}</Link>
        <Badge variant="outline">{node.source}</Badge>
        <Badge variant={node.risk === "at_risk" ? "destructive" : "outline"}>{node.risk.replaceAll("_", " ")}</Badge>
      </div>
      {node.nextAction ? <p className="text-sm">Next action: {node.nextAction}</p> : null}
      {node.ownerName ? <p className="text-xs text-muted-foreground">Owner: {node.ownerName}</p> : <p className="text-xs text-muted-foreground">Owner name unavailable</p>}
      {node.diagnostics.length > 0 ? <p className="text-xs text-muted-foreground">Needs review: {node.diagnostics.map((item) => item.replaceAll("_", " ")).join(", ")}</p> : null}
      {depth < 9 && node.dependencies.length > 0 ? <ul className="space-y-2 border-l border-border pl-3">
        {node.dependencies.map((dependency, index) => <li key={`${node.key}-${index}`} className="space-y-1">
          <div className="flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">{dependency.kind.replaceAll("_", " ")}{dependency.evidence ? ` · ${dependency.evidence}` : ""}</p>{dependency.id && dependency.version ? <Button size="sm" variant="ghost" onClick={() => onRemove(dependency.id!, dependency.version!)}>Remove</Button> : null}</div>
          {dependency.target.kind === "visible" ? <ul><ChainNode node={dependency.target} depth={depth + 1} onRemove={onRemove} /></ul> :
            <div className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">{dependency.target.title}</div>}
        </li>)}
      </ul> : null}
    </li>
  );
}

export function CommitmentRadarSheet({ root, open, onClose }: {
  root: CommitmentReference;
  open: boolean;
  onClose: () => void;
}) {
  const chain = useCalendarCommitmentChain(root, open);
  const canWrite = useCan("calendar:write");
  const [editing, setEditing] = useState(false);
  const [targetSource, setTargetSource] = useState<CommitmentReference["source"]>("build");
  const [targetType, setTargetType] = useState("ticket");
  const [targetId, setTargetId] = useState("");
  const [kind, setKind] = useState<"blocks" | "requires" | "funds" | "fulfills" | "staffs">("requires");
  const [evidence, setEvidence] = useState("");
  const target: CommitmentReference | null = /^\d+$/.test(targetId)
    ? { source: targetSource, type: targetType, recordId: targetId }
    : null;
  const targetChain = useCalendarCommitmentChain(target, open && editing);
  const createEdge = useCreateCalendarCommitmentEdge();
  const removeEdge = useRemoveCalendarCommitmentEdge();
  const remove = async (id: string, version: number) => {
    try {
      await removeEdge.mutateAsync({ id, version });
      toast.success("Commitment unlinked");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };
  const setSource = (source: CommitmentReference["source"]) => {
    setTargetSource(source);
    setTargetType({ crm: "deal", build: "ticket", inventory: "purchase_order", finance: "invoice", hr: "requisition", tasks: "task" }[source]);
    setTargetId("");
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const current = chain.data?.root;
    const selected = targetChain.data?.root;
    if (!current || !selected || !target ||
      (target.source === root.source && target.type === root.type && target.recordId === root.recordId)) return;
    try {
      await createEdge.mutateAsync({
        from: root,
        to: target,
        kind,
        evidence: evidence.trim(),
        expectedFromVersion: current.sourceVersion,
        expectedToVersion: selected.sourceVersion,
      });
      toast.success("Commitment linked");
      setTargetId("");
      setEvidence("");
      setEditing(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-xl">
        <SheetHeader className="border-b px-5 py-4"><SheetTitle>Commitment radar</SheetTitle></SheetHeader>
        <ScrollArea className="min-h-0 flex-1"><div className="space-y-4 px-5 py-4">
          {chain.isLoading ? <p className="text-sm text-muted-foreground">Loading commitment chain</p> : null}
          {chain.isError ? <div className="space-y-2"><p className="text-sm text-destructive">{getErrorMessage(chain.error)}</p><Button variant="outline" onClick={() => { void chain.refetch(); }}>Retry</Button></div> : null}
          {chain.data ? <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={chain.data.risk === "at_risk" ? "destructive" : "outline"}>{chain.data.risk.replaceAll("_", " ")}</Badge>
              <span className="text-xs text-muted-foreground">{chain.data.coverage === "complete" ? "Sources checked" : "Some dependencies need review"}</span>
            </div>
            {chain.data.root ? <ul><ChainNode node={chain.data.root} depth={0} onRemove={(id, version) => { void remove(id, version); }} /></ul> :
              <p className="text-sm text-muted-foreground">This source is unavailable to your current access.</p>}
            {canWrite && chain.data.root ? <div className="space-y-3 border-t border-border pt-4">
              <Button variant="outline" onClick={() => setEditing((value) => !value)}>{editing ? "Cancel link" : "Link dependency"}</Button>
              {editing ? <form onSubmit={(event) => { void submit(event); }} className="space-y-3">
                <div className="space-y-1"><Label htmlFor="commitment-target-source">Business area</Label>
                  <Select value={targetSource} onValueChange={(value) => setSource(value as CommitmentReference["source"])}>
                    <SelectTrigger id="commitment-target-source" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="crm">CRM deal</SelectItem>
                      <SelectItem value="build">Build ticket</SelectItem>
                      <SelectItem value="inventory">Inventory purchase order</SelectItem>
                      <SelectItem value="finance">Finance invoice</SelectItem>
                      <SelectItem value="hr">HR requisition</SelectItem>
                      <SelectItem value="tasks">Task</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {targetSource === "build" ? <div className="space-y-1"><Label htmlFor="commitment-target-type">Record type</Label>
                  <Select value={targetType} onValueChange={setTargetType}>
                    <SelectTrigger id="commitment-target-type" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ticket">Ticket</SelectItem>
                      <SelectItem value="task">Task</SelectItem>
                    </SelectContent>
                  </Select>
                </div> : null}
                <div className="space-y-1"><Label htmlFor="commitment-target-id">Record ID</Label><Input id="commitment-target-id" value={targetId} onChange={(event) => setTargetId(event.target.value.trim())} inputMode="numeric" required /></div>
                <div className="space-y-1"><Label htmlFor="commitment-kind">Relationship</Label>
                  <Select value={kind} onValueChange={(value) => setKind(value as typeof kind)}>
                    <SelectTrigger id="commitment-kind" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="requires">Requires</SelectItem>
                      <SelectItem value="blocks">Blocks</SelectItem>
                      <SelectItem value="funds">Funds</SelectItem>
                      <SelectItem value="fulfills">Fulfills</SelectItem>
                      <SelectItem value="staffs">Staffs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label htmlFor="commitment-evidence">Evidence</Label><Input id="commitment-evidence" value={evidence} maxLength={1000} onChange={(event) => setEvidence(event.target.value)} required /></div>
                {targetChain.isLoading ? <p className="text-xs text-muted-foreground">Checking target access and version</p> : null}
                {targetChain.data?.root ? <p className="text-xs text-muted-foreground">Target: {targetChain.data.root.title}</p> : target && !targetChain.isLoading ? <p className="text-xs text-muted-foreground">Target is unavailable to your current access.</p> : null}
                <Button type="submit" disabled={!targetChain.data?.root || !evidence.trim() || createEdge.isPending}>Save relationship</Button>
              </form> : null}
            </div> : null}
          </> : null}
        </div></ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
