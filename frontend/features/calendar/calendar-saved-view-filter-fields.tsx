"use client";

import { useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { MemberPicker } from "@/components/members/member-picker";
import type { MemberOption } from "@/components/members/member-picker-options";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCalendarSources } from "@/hooks/api/calendar";
import { useInfiniteProjects } from "@/hooks/api/build/projects";
import { usePeople } from "@/hooks/api/directory/people";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useCalendarConnections } from "./use-calendar-connections";
import type { CalendarSavedViewFormValues } from "./calendar-saved-view-form-schema";

function CalendarSavedViewOwnerField({ actorMembershipId }: { actorMembershipId: number | null }) {
  const form = useFormContext<CalendarSavedViewFormValues>();
  const [ownerSearch, setOwnerSearch] = useState("");
  const search = useDebouncedValue(ownerSearch, 300);
  const people = usePeople({ limit: 100, search });
  const ownerValue = form.watch("ownerMembershipId");
  const candidates = useMemo<MemberOption[]>(
    () =>
      (people.data?.data ?? []).flatMap((person) => {
        if (person.organizationMembershipId === null) return [];
        return [{
          id: String(person.organizationMembershipId),
          email: person.workEmail ?? person.personalEmail ?? "",
          image: person.avatarUrl,
          name: person.displayName,
          firstName: person.firstName,
          lastName: person.lastName,
        }];
      }),
    [people.data?.data],
  );
  const pickerValue =
    ownerValue === "all"
      ? ""
      : ownerValue === "me" && actorMembershipId
        ? String(actorMembershipId)
        : ownerValue;
  const knownMembers = useMemo<MemberOption[] | undefined>(() => {
    if (!pickerValue || candidates.some((member) => member.id === pickerValue)) return undefined;
    return [{
      id: pickerValue,
      email: "",
      image: null,
      name: ownerValue === "me" ? "Me" : "Selected member",
    }];
  }, [pickerValue, candidates, ownerValue]);

  function handleOwnerSearch(value: string) {
    setOwnerSearch(value);
  }

  function handleOwnerChange(membershipId: string | null) {
    if (!membershipId) {
      form.setValue("ownerMembershipId", "all", { shouldDirty: true });
      return;
    }
    const next =
      actorMembershipId !== null && membershipId === String(actorMembershipId)
        ? "me"
        : membershipId;
    form.setValue("ownerMembershipId", next, { shouldDirty: true });
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="saved-view-owner">Owner</Label>
      <MemberPicker
        id="saved-view-owner"
        value={pickerValue}
        onChange={handleOwnerChange}
        candidates={candidates}
        knownMembers={knownMembers}
        allowUnassigned
        unassignedLabel="Anyone"
        placeholder="Anyone"
        searchLabel="Find saved view owner"
        onSearchChange={handleOwnerSearch}
        modal
      />
    </div>
  );
}

export function CalendarSavedViewFilterFields({ actorMembershipId }: { actorMembershipId: number | null }) {
  const form = useFormContext<CalendarSavedViewFormValues>();
  const sources = useCalendarSources();
  const connections = useCalendarConnections();
  const projects = useInfiniteProjects({ limit: 100 });
  const projectRows = projects.data?.pages.flatMap((page) => page.data) ?? [];
  const sourceValue = form.watch("sourceKey");
  const projectValue = form.watch("projectId");
  const actionableValue = form.watch("actionable");
  const sourceOptions = [
    ...(sources.data ?? []).filter((source) => source.enabled).map((source) => ({ value: source.key, label: source.label })),
    ...(connections.data ?? []).filter((connection) => connection.status === "active" && (connection.toolkit === "googlecalendar" || connection.toolkit === "outlook")).map((connection) => ({
      value: `external:${connection.toolkit}:${connection.id}`,
      label: connection.accountEmail ?? `${connection.toolkit} account`,
    })),
  ];

  return (
    <div className="space-y-3 rounded-lg bg-muted p-3 dark:border dark:border-background">
      <p className="text-sm font-medium">Filters</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Source</Label>
          <Select value={sourceValue} onValueChange={(value) => form.setValue("sourceKey", value, { shouldDirty: true })}>
            <SelectTrigger aria-label="Saved view source"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All visible sources</SelectItem>
              {sourceOptions.map((source) => <SelectItem key={source.value} value={source.value}>{source.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <CalendarSavedViewOwnerField actorMembershipId={actorMembershipId} />
        <div className="space-y-1.5">
          <Label>Project</Label>
          <Select value={projectValue} onValueChange={(value) => form.setValue("projectId", value, { shouldDirty: true })}>
            <SelectTrigger aria-label="Saved view project"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any project</SelectItem>
              {projectRows.map((project) => <SelectItem key={project.id} value={String(project.id)}>{project.name}</SelectItem>)}
              {projectValue !== "all" && !projectRows.some((project) => String(project.id) === projectValue) ? <SelectItem value={projectValue}>Selected project</SelectItem> : null}
            </SelectContent>
          </Select>
          {projects.hasNextPage ? <Button type="button" size="sm" variant="ghost" disabled={projects.isFetchingNextPage} onClick={() => void projects.fetchNextPage()}>More projects</Button> : null}
        </div>
        <div className="space-y-1.5">
          <Label>Action needed</Label>
          <Select value={actionableValue} onValueChange={(value) => form.setValue("actionable", value as CalendarSavedViewFormValues["actionable"], { shouldDirty: true })}>
            <SelectTrigger aria-label="Saved view action filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All items</SelectItem>
              <SelectItem value="true">Action needed</SelectItem>
              <SelectItem value="false">Informational</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="saved-view-status">Exact status</Label>
          <Input id="saved-view-status" {...form.register("status")} maxLength={100} placeholder="For example, OPEN" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="saved-view-location">Location contains</Label>
          <Input id="saved-view-location" {...form.register("location")} maxLength={200} placeholder="Office or meeting place" />
        </div>
      </div>
    </div>
  );
}
