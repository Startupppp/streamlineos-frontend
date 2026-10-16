"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorState } from "@/components/shared/error-state";
import { useCan } from "@/hooks/api/access";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useCalendarBookingRouting, useCalendarRoutingHosts, useSaveCalendarBookingRouting } from "@/hooks/api/calendar/booking-routing";
import { routingRuleInputSchema, type RoutingRule, type RoutingRuleInput } from "@/hooks/api/calendar/booking-routing-schema";
import type { CalendarBookingRule } from "@/hooks/api/calendar/booking-rules-schema";
import { getErrorMessage } from "@/lib/get-error-message";

function initialRouting(current: RoutingRule | null): RoutingRuleInput {
  return current ? {
    expectedVersion: current.version,
    mode: current.mode,
    fallbackMode: current.fallbackMode,
    crmOwnerEnabled: current.crmOwnerEnabled,
    collectiveMinimumHosts: current.collectiveMinimumHosts,
    hosts: current.hosts,
  } : {
    expectedVersion: 0,
    mode: "fair_rotation",
    fallbackMode: "next_eligible",
    crmOwnerEnabled: false,
    collectiveMinimumHosts: 1,
    hosts: [],
  };
}

function RoutingEditor({ rule, current }: { rule: CalendarBookingRule; current: RoutingRule | null }) {
  const canWrite = useCan("calendar:write");
  const save = useSaveCalendarBookingRouting(rule.id);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState("");
  const [error, setError] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(memberSearch.trim(), 300);
  const members = useCalendarRoutingHosts(rule.id, debouncedSearch);
  const form = useForm<RoutingRuleInput>({ resolver: zodResolver(routingRuleInputSchema), defaultValues: initialRouting(current) });
  const hosts = useFieldArray({ control: form.control, name: "hosts" });
  const mode = form.watch("mode");
  const controlsDisabled = !canWrite || save.isPending;
  const selectedIds = new Set(hosts.fields.map((host) => host.membershipId));

  function addHost() {
    const membershipId = Number(selectedMember);
    if (!Number.isInteger(membershipId) || selectedIds.has(membershipId)) return;
    hosts.append({ membershipId, weight: 1, priority: 0, territories: [], languages: [], minimumSkillLevel: 1, dailyLimit: null, active: true });
    setSelectedMember("");
    setError(null);
  }

  async function submit(input: RoutingRuleInput) {
    try {
      await save.mutateAsync(input);
      setError(null);
      toast.success("Team routing saved");
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  return <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
    {current ? <p className="text-sm text-muted-foreground">Rule version {current.version} · {current.status}</p> : <p className="text-sm text-muted-foreground">Choose hosts and save to start routing team bookings.</p>}
    {error ? <p role="alert" className="rounded-md border border-destructive p-2 text-sm text-destructive">{error}</p> : null}
    <fieldset disabled={controlsDisabled} className="space-y-4 disabled:opacity-70">
      <Controller control={form.control} name="mode" render={({ field }) => <div className="space-y-1"><Label htmlFor="routing-mode">Selection method</Label><Select value={field.value} onValueChange={field.onChange} disabled={controlsDisabled}><SelectTrigger id="routing-mode" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fair_rotation">Fair rotation</SelectItem><SelectItem value="weighted_rotation">Weighted rotation</SelectItem><SelectItem value="least_loaded">Least loaded</SelectItem><SelectItem value="collective">All eligible hosts</SelectItem></SelectContent></Select></div>} />
      <Controller control={form.control} name="fallbackMode" render={({ field }) => <div className="space-y-1"><Label htmlFor="routing-fallback">When no host matches</Label><Select value={field.value} onValueChange={field.onChange} disabled={controlsDisabled}><SelectTrigger id="routing-fallback" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="next_eligible">Next eligible host</SelectItem><SelectItem value="primary_host">Primary booking-page host</SelectItem><SelectItem value="no_match">Show no available slot</SelectItem></SelectContent></Select></div>} />
      <Controller control={form.control} name="crmOwnerEnabled" render={({ field }) => <label className="flex items-center gap-2 text-sm"><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={controlsDisabled} />Keep the CRM owner when eligible</label>} />
      {mode === "collective" ? <div className="space-y-1"><Label htmlFor="routing-minimum">Minimum eligible hosts</Label><Input id="routing-minimum" type="number" min={1} max={25} {...form.register("collectiveMinimumHosts", { valueAsNumber: true })} />{form.formState.errors.collectiveMinimumHosts ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.collectiveMinimumHosts.message}</p> : null}</div> : null}
      <fieldset className="space-y-3"><legend className="text-sm font-medium">Eligible hosts</legend>
        {hosts.fields.map((host, index) => <div key={host.id} className="space-y-3 rounded-md border p-3"><div className="flex items-center justify-between"><p className="text-sm font-medium">{members.data?.find((member) => member.membershipId === host.membershipId)?.name ?? `Member #${host.membershipId}`}</p><Button type="button" size="sm" variant="outline" onClick={() => hosts.remove(index)}>Remove</Button></div>
          <input type="hidden" {...form.register(`hosts.${index}.membershipId`, { valueAsNumber: true })} />
          <Controller control={form.control} name={`hosts.${index}.active`} render={({ field }) => <label className="flex items-center gap-2 text-sm"><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={controlsDisabled} />Eligible for routing</label>} />
          <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label htmlFor={`routing-weight-${index}`}>Weight</Label><Input id={`routing-weight-${index}`} type="number" min={1} max={100} {...form.register(`hosts.${index}.weight`, { valueAsNumber: true })} /></div><div className="space-y-1"><Label htmlFor={`routing-priority-${index}`}>Priority</Label><Input id={`routing-priority-${index}`} type="number" min={-1000} max={1000} {...form.register(`hosts.${index}.priority`, { valueAsNumber: true })} /></div></div>
          <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label htmlFor={`routing-skill-${index}`}>Minimum skill level</Label><Input id={`routing-skill-${index}`} type="number" min={1} max={5} {...form.register(`hosts.${index}.minimumSkillLevel`, { valueAsNumber: true })} /></div><Controller control={form.control} name={`hosts.${index}.dailyLimit`} render={({ field }) => <div className="space-y-1"><Label htmlFor={`routing-limit-${index}`}>Daily limit</Label><Input id={`routing-limit-${index}`} type="number" min={1} max={100} value={field.value ?? ""} onChange={(event) => field.onChange(event.target.value ? Number(event.target.value) : null)} /></div>} /></div>
          <Controller control={form.control} name={`hosts.${index}.territories`} render={({ field }) => <div className="space-y-1"><Label htmlFor={`routing-territories-${index}`}>Territories</Label><Input id={`routing-territories-${index}`} value={field.value.join(", ")} onChange={(event) => field.onChange(event.target.value.split(",").map((value) => value.trim()).filter(Boolean))} placeholder="North, South" /></div>} />
          <Controller control={form.control} name={`hosts.${index}.languages`} render={({ field }) => <div className="space-y-1"><Label htmlFor={`routing-languages-${index}`}>Languages</Label><Input id={`routing-languages-${index}`} value={field.value.join(", ")} onChange={(event) => field.onChange(event.target.value.split(",").map((value) => value.trim()).filter(Boolean))} placeholder="en, hi" /></div>} />
        </div>)}
        <div className="space-y-1"><Label htmlFor="routing-member-search">Find an organization member</Label><Input id="routing-member-search" value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} /></div>
        {members.access.denied ? <p className="text-sm text-muted-foreground">Host selection is unavailable to this account.</p> : members.access.unavailable || members.isError ? <ErrorState title="Hosts unavailable" error={members.error} onRetry={() => void members.refetch()} /> : members.access.pending || members.isPending ? <p role="status">Loading hosts…</p> : <div className="flex gap-2"><Select value={selectedMember} onValueChange={setSelectedMember} disabled={controlsDisabled}><SelectTrigger aria-label="Host to add" className="min-w-0 flex-1"><SelectValue placeholder="Choose a host" /></SelectTrigger><SelectContent>{(members.data ?? []).filter((member) => !selectedIds.has(member.membershipId)).map((member) => <SelectItem key={member.membershipId} value={String(member.membershipId)}>{member.name ?? member.email}</SelectItem>)}</SelectContent></Select><Button type="button" variant="outline" onClick={addHost} disabled={!selectedMember || hosts.fields.length >= 25}>Add host</Button></div>}
        {form.formState.errors.hosts ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.hosts.message ?? "Review host settings and add at least one eligible host."}</p> : null}
      </fieldset>
      <Button type="submit">Save routing</Button>
    </fieldset>
  </form>;
}

export function CalendarBookingRoutingPanel({ rule, onBack }: { rule: CalendarBookingRule; onBack: () => void }) {
  const routing = useCalendarBookingRouting(rule.id);
  return <div className="space-y-4"><Button variant="outline" onClick={onBack}>Back to booking pages</Button><div><h3 className="font-medium">Team routing</h3><p className="text-sm text-muted-foreground">{rule.title}</p></div>{routing.access.denied ? <p className="text-sm text-muted-foreground">You do not have access to routing settings.</p> : routing.access.unavailable || routing.isError ? <ErrorState title="Routing unavailable" error={routing.error} onRetry={() => void routing.refetch()} /> : routing.access.pending || routing.isPending ? <p role="status">Loading routing…</p> : <RoutingEditor key={`${rule.id}:${routing.data?.version ?? 0}`} rule={rule} current={routing.data ?? null} />}</div>;
}
