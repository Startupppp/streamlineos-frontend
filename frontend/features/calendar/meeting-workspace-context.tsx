"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Link2, ShieldCheck, Unlink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CalendarMeetingWorkspace } from "@/hooks/api/calendar-meeting-workspace-schema";
import {
  useAddCalendarMeetingContext,
  useUpdateCalendarMeetingContext,
} from "@/hooks/api/calendar-meeting-workspace";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

const contextLabels = {
  ENTITY: "CRM or Build record",
  DOCUMENT: "Document",
  MAIL: "Mail thread",
  CHAT: "Chat message",
  RECORDING: "Recording",
  TRANSCRIPT: "Transcript",
} as const;

const defaultSourceKeys: Record<keyof typeof contextLabels, string> = {
  ENTITY: "deal",
  DOCUMENT: "kb-linked-document",
  MAIL: "mail-thread",
  CHAT: "chat-message",
  RECORDING: "hr-interview",
  TRANSCRIPT: "hr-interview",
};

export function MeetingWorkspaceContext({ workspace }: { workspace: CalendarMeetingWorkspace }) {
  const [contextType, setContextType] = useState<keyof typeof contextLabels>("ENTITY");
  const [sourceKey, setSourceKey] = useState("deal");
  const [sourceRecordId, setSourceRecordId] = useState("");
  const [scopeId, setScopeId] = useState("");
  const [share, setShare] = useState(false);
  const add = useAddCalendarMeetingContext();
  const update = useUpdateCalendarMeetingContext();

  const handleAdd = () => {
    if (!sourceKey.trim() || !sourceRecordId.trim()) return;
    const locator = contextType === "MAIL"
      ? { accountId: Number(scopeId) }
      : contextType === "CHAT"
        ? { channelId: Number(scopeId) }
        : {};
    add.mutate({
      workspaceId: workspace.id,
      contextType,
      sourceKey: sourceKey.trim(),
      sourceRecordId: sourceRecordId.trim(),
      locator,
      sharedWithGuests: share,
      consentStatus: contextType === "RECORDING" || contextType === "TRANSCRIPT" ? "PENDING" : "NOT_REQUIRED",
    }, {
      onSuccess: () => {
        setSourceRecordId("");
        setScopeId("");
        setShare(false);
        toast.success("Context linked");
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  const changeContext = (contextId: string, expectedVersion: number, body: { sharedWithGuests?: boolean; revoke?: boolean; consentStatus?: "GRANTED" | "WITHDRAWN" }) => {
    update.mutate({ workspaceId: workspace.id, contextId, expectedVersion, ...body }, {
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  return (
    <div className="space-y-4">
      {workspace.canManage ? <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
        <Select value={contextType} onValueChange={(value) => {
          const next = value as keyof typeof contextLabels;
          setContextType(next);
          setSourceKey(defaultSourceKeys[next]);
          setSourceRecordId("");
          setScopeId("");
        }}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(contextLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
        </Select>
        <Input value={sourceKey} onChange={(event) => setSourceKey(event.target.value)} placeholder="Source type" className="h-8 text-xs" />
        <Input value={sourceRecordId} onChange={(event) => setSourceRecordId(event.target.value)} placeholder="Record or message ID" className="h-8 text-xs" />
        {contextType === "MAIL" || contextType === "CHAT" ? (
          <Input value={scopeId} onChange={(event) => setScopeId(event.target.value)} placeholder={contextType === "MAIL" ? "Mail account ID" : "Channel ID"} className="h-8 text-xs" />
        ) : <div />}
        <Label className="flex items-center gap-2 text-xs font-normal">
          <Checkbox checked={share} onCheckedChange={(value) => setShare(value === true)} />
          Share availability with guests
        </Label>
        <Button size="sm" className="h-8" onClick={handleAdd} disabled={add.isPending || !sourceRecordId.trim()}>
          <Link2 className="mr-1.5 h-3.5 w-3.5" />Link context
        </Button>
      </div> : null}

      <div className="space-y-2">
        {workspace.contexts.length === 0 ? <p className="text-xs text-muted-foreground">No linked context yet.</p> : null}
        {workspace.contexts.map((context) => (
          <div key={context.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {context.state === "AVAILABLE" ? <ShieldCheck className="h-4 w-4 text-status-success shrink-0" /> : <AlertCircle className="h-4 w-4 text-status-warning shrink-0" />}
                  <p className="text-sm font-medium truncate">{context.title ?? contextLabels[context.contextType]}</p>
                </div>
                {context.summary ? <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{context.summary}</p> : null}
              </div>
              <Badge variant="outline" className="text-micro shrink-0">{context.state.replaceAll("_", " ")}</Badge>
            </div>
            {context.failureCode ? <p className="text-micro text-muted-foreground">{context.failureCode.replaceAll("_", " ").toLowerCase()}</p> : null}
            <div className="flex flex-wrap items-center gap-2">
              {context.href && context.state !== "UNAVAILABLE" ? <Button asChild variant="outline" size="sm" className="h-7 text-xs"><Link href={context.href}>Open source</Link></Button> : null}
              {workspace.canManage ? (
                <>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => changeContext(context.id, context.version, { sharedWithGuests: !context.sharedWithGuests })}>
                    {context.sharedWithGuests ? "Stop guest sharing" : "Share with guests"}
                  </Button>
                  {(context.contextType === "RECORDING" || context.contextType === "TRANSCRIPT") ? (
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => changeContext(context.id, context.version, { consentStatus: context.consentStatus === "GRANTED" ? "WITHDRAWN" : "GRANTED" })}>
                      {context.consentStatus === "GRANTED" ? "Withdraw consent" : "Record consent"}
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => changeContext(context.id, context.version, { revoke: true })} disabled={context.state === "REVOKED"}>
                    <Unlink className="mr-1 h-3.5 w-3.5" />Revoke
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
