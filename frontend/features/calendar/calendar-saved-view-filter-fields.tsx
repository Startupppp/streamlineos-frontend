"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { MemberPicker } from "@/components/members/member-picker";
import type { MemberOption } from "@/components/members/member-picker-options";
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
import {
  useMemberDirectory,
  type DirectoryMember,
} from "@/hooks/api/members/use-member-directory";
import { useCalendarConnections } from "./use-calendar-connections";
import type { CalendarSavedViewFormValues } from "./calendar-saved-view-form-schema";

function toMemberOption(member: DirectoryMember): MemberOption {
  return {
    id: member.id,
    email: member.email,
    image: member.image,
    name: member.name,
    firstName: member.firstName,
    lastName: member.lastName,
  };
}

function CalendarSavedViewOwnerField({ actorMembershipId }: { actorMembershipId: number | null }) {
  const form = useFormContext<CalendarSavedViewFormValues>();
  const [ownerSearch, setOwnerSearch] = useState("");
  const [pickedUserId, setPickedUserId] = useState("");
  const ownerValue = form.watch("ownerMembershipId");
  const targetMembership =
    ownerValue === "all"
      ? null
      : ownerValue === "me"
        ? actorMembershipId
        : Number(ownerValue);
  const selectedIds = useMemo(
    () => (pickedUserId ? [pickedUserId] : []),
    [pickedUserId],
  );
  const { members, selectedMembers } = useMemberDirectory(
    { kind: "org" },
    { search: ownerSearch, enabled: true, selectedIds },
  );
  const roster = useMemo(() => {
    const byId = new Map<string, DirectoryMember>();
    for (const member of [...selectedMembers, ...members]) byId.set(member.id, member);
    return [...byId.values()];
  }, [members, selectedMembers]);
  const resolvedUserId =
    roster.find((member) => member.membershipId === targetMembership)?.id ?? "";
  const pickerValue = pickedUserId || resolvedUserId;
  const candidates = useMemo(() => roster.map(toMemberOption), [roster]);

  function handleOwnerSearch(value: string) {
    setOwnerSearch(value);
  }

  function handleOwnerChange(userId: string | null) {
    setPickedUserId(userId ?? "");
    if (!userId) {
      form.setValue("ownerMembershipId", "all", { shouldDirty: true });
      return;
    }
    const member = roster.find((item) => item.id === userId);
    if (!member?.membershipId) return;
    const next =
      actorMembershipId !== null && member.membershipId === actorMembershipId
        ? "me"
        : String(member.membershipId);
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
  const [projectOpen, setProjectOpen] = useState(false);
  const nextProjectPageRef = useRef<HTMLDivElement | null>(null);
  const lastRequestedUpdateRef = useRef<number | null>(null);
  const { hasNextPage, isFetchingNextPage, dataUpdatedAt, fetchNextPage } = projects;
  useEffect(() => {
    if (!projectOpen || !hasNextPage || isFetchingNextPage || !dataUpdatedAt) return;
    const sentinel = nextProjectPageRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;
    const update = dataUpdatedAt;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting || lastRequestedUpdateRef.current === update) return;
      lastRequestedUpdateRef.current = update;
      void fetchNextPage();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [projectOpen, hasNextPage, isFetchingNextPage, dataUpdatedAt, fetchNextPage]);
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
          <Select value={projectValue} onOpenChange={setProjectOpen} onValueChange={(value) => form.setValue("projectId", value, { shouldDirty: true })}>
            <SelectTrigger aria-label="Saved view project"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any project</SelectItem>
              {projectRows.map((project) => <SelectItem key={project.id} value={String(project.id)}>{project.name}</SelectItem>)}
              {projectValue !== "all" && !projectRows.some((project) => String(project.id) === projectValue) ? <SelectItem value={projectValue}>Selected project</SelectItem> : null}
              {hasNextPage ? <div ref={nextProjectPageRef} role="status" className="px-2 py-1 text-xs text-muted-foreground">{isFetchingNextPage ? "Loading more projects…" : "Scroll to see more projects"}</div> : null}
            </SelectContent>
          </Select>
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
