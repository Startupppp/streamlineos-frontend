"use client";

import { useState } from "react";
import { AppSheet } from "@/components/shared/app-sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateCalendarWorkflowRule } from "@/hooks/api/calendar-workflows";
import { calendarWorkflowChannels, calendarWorkflowTriggers, type CalendarWorkflowChannel, type CalendarWorkflowTrigger } from "@/hooks/api/calendar-workflows-schema";

const conditionFields = ["aggregate_type", "lifecycle_state", "start_at", "end_at", "occurrence_id", "source_key", "source_status"] as const;
const recipientTypes = ["actor", "organizer", "attendees", "members"] as const;

export function CalendarWorkflowRuleDialog({ open, onOpenChange }: { open: boolean; onOpenChange(open: boolean): void }) {
  const createRule = useCreateCalendarWorkflowRule();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState<CalendarWorkflowTrigger>("calendar.booking.created");
  const [conditionField, setConditionField] = useState<(typeof conditionFields)[number]>("lifecycle_state");
  const [conditionValue, setConditionValue] = useState("");
  const [recipient, setRecipient] = useState<(typeof recipientTypes)[number]>("organizer");
  const [membershipIds, setMembershipIds] = useState("");
  const [channels, setChannels] = useState<CalendarWorkflowChannel[]>(["IN_APP"]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("/calendar");

  function toggleChannel(channel: CalendarWorkflowChannel, checked: boolean) {
    setChannels((current) => checked ? [...current, channel] : current.filter((value) => value !== channel));
  }

  function changeTrigger(value: string) {
    const selected = calendarWorkflowTriggers.find((candidate) => candidate === value);
    if (selected) setTrigger(selected);
  }

  function changeConditionField(value: string) {
    const selected = conditionFields.find((candidate) => candidate === value);
    if (selected) setConditionField(selected);
  }

  function changeRecipient(value: string) {
    const selected = recipientTypes.find((candidate) => candidate === value);
    if (selected) setRecipient(selected);
  }

  async function submit() {
    const ids = membershipIds.split(",").map((value) => Number(value.trim())).filter((value) => Number.isInteger(value) && value > 0);
    if (!name.trim() || !title.trim() || !message.trim() || channels.length === 0 || (recipient === "members" && ids.length === 0)) {
      toast.error("Complete the required rule fields");
      return;
    }
    try {
      await createRule.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        status: "active",
        triggers: [trigger],
        conditions: conditionValue.trim() ? [{ field: conditionField, op: "eq", value: conditionValue.trim() }] : [],
        actions: [{
          type: "notification",
          recipients: recipient === "members" ? { type: "members", membershipIds: ids } : { type: recipient },
          channels,
          priority: "NORMAL",
          title: title.trim(),
          message: message.trim(),
          link: link.trim() || null,
        }],
      });
      setName("");
      setDescription("");
      setTitle("");
      setMessage("");
      onOpenChange(false);
      toast.success("Workflow rule created");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Create workflow rule"
      description="Choose a committed lifecycle event, optional condition, recipients, and delivery channels."
      className="sm:max-w-2xl"
      footer={<LoadingButton isPending={createRule.isPending} onClick={() => void submit()}>Create rule</LoadingButton>}
    >
        <div className="space-y-4 pr-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="workflow-name">Name</Label><Input id="workflow-name" value={name} onChange={(event) => setName(event.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="workflow-trigger">Trigger</Label><Select value={trigger} onValueChange={changeTrigger}><SelectTrigger id="workflow-trigger"><SelectValue /></SelectTrigger><SelectContent>{calendarWorkflowTriggers.map((value) => <SelectItem key={value} value={value}>{value.replace("calendar.", "")}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="workflow-description">Description</Label><Textarea id="workflow-description" value={description} onChange={(event) => setDescription(event.target.value)} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="workflow-condition-field">Optional condition</Label><Select value={conditionField} onValueChange={changeConditionField}><SelectTrigger id="workflow-condition-field"><SelectValue /></SelectTrigger><SelectContent>{conditionFields.map((value) => <SelectItem key={value} value={value}>{value.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="workflow-condition-value">Equals</Label><Input id="workflow-condition-value" value={conditionValue} onChange={(event) => setConditionValue(event.target.value)} placeholder="Leave blank for any value" /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="workflow-recipient">Recipients</Label><Select value={recipient} onValueChange={changeRecipient}><SelectTrigger id="workflow-recipient"><SelectValue /></SelectTrigger><SelectContent>{recipientTypes.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
            {recipient === "members" ? <div className="space-y-1.5"><Label htmlFor="workflow-members">Membership IDs</Label><Input id="workflow-members" value={membershipIds} onChange={(event) => setMembershipIds(event.target.value)} placeholder="12, 34" /></div> : null}
          </div>
          <fieldset className="space-y-2"><legend className="text-sm font-medium">Channels</legend><div className="flex flex-wrap gap-3">{calendarWorkflowChannels.map((channel) => <Label key={channel} className="flex items-center gap-2 font-normal"><Checkbox checked={channels.includes(channel)} onCheckedChange={(value) => toggleChannel(channel, value === true)} />{channel.replace("_", " ")}</Label>)}</div></fieldset>
          <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="workflow-title">Notification title</Label><Input id="workflow-title" value={title} onChange={(event) => setTitle(event.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="workflow-link">Link</Label><Input id="workflow-link" value={link} onChange={(event) => setLink(event.target.value)} /></div></div>
          <div className="space-y-1.5"><Label htmlFor="workflow-message">Message</Label><Textarea id="workflow-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Use {aggregate_id} when needed" /></div>
        </div>
    </AppSheet>
  );
}
