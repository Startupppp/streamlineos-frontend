"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCalendarCapacity,
  useCalendarPersonalCapacity,
  useCalendarResources,
  useCalendarTeamCapacity,
  useCalendarWarehouseCapacity,
} from "@/hooks/api/calendar-capacity";
import { useCan, useScope } from "@/hooks/api/access";
import { usePeople } from "@/hooks/api/directory/people";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";
import { CapacityWindowFields } from "./calendar-capacity-window";

export function CalendarCapacitySheet({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<
    "resources" | "personal" | "team" | "warehouse"
  >("resources");
  const [warehouseId, setWarehouseId] = useState(0);
  const [memberSearch, setMemberSearch] = useState("");
  const [membershipId, setMembershipId] = useState(0);
  const [resourceId, setResourceId] = useState(0);
  const [start, setStart] = useState(() =>
    format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  );
  const [end, setEnd] = useState(() =>
    format(new Date(Date.now() + 60 * 60_000), "yyyy-MM-dd'T'HH:mm"),
  );
  const [units, setUnits] = useState(1);
  const resources = useCalendarResources();
  const canReadWarehouses = useCan("inventory:warehouses:read");
  const warehouses = useWarehouses({ limit: 100 });
  const selectedWarehouseId = warehouseId || warehouses.data?.items[0]?.id || 0;
  const peopleScope = useScope("directory:people:view");
  const people = usePeople({ limit: 50, search: memberSearch });
  const selectedId = resourceId || resources.data?.[0]?.id || 0;
  const input = useMemo(() => {
    const begin = new Date(start);
    const finish = new Date(end);
    return selectedId &&
      Number.isFinite(begin.getTime()) &&
      Number.isFinite(finish.getTime()) &&
      finish > begin &&
      finish.getTime() - begin.getTime() <= 31 * 86_400_000 &&
      units > 0
      ? {
          resourceId: selectedId,
          start: begin.toISOString(),
          end: finish.toISOString(),
          units,
        }
      : null;
  }, [selectedId, start, end, units]);
  const capacity = useCalendarCapacity(input, mode === "resources");
  const personalInput = useMemo(() => {
    const begin = new Date(start);
    const finish = new Date(end);
    return Number.isFinite(begin.getTime()) &&
      Number.isFinite(finish.getTime()) &&
      finish > begin &&
      finish.getTime() - begin.getTime() <= 24 * 60 * 60_000
      ? { start: begin.toISOString(), end: finish.toISOString() }
      : null;
  }, [start, end]);
  const personal = useCalendarPersonalCapacity(
    personalInput,
    mode === "personal",
  );
  const team = useCalendarTeamCapacity(
    membershipId,
    personalInput,
    mode === "team" && peopleScope === "all",
  );
  const warehouse = useCalendarWarehouseCapacity(
    selectedWarehouseId,
    mode === "warehouse",
  );
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle>Capacity</SheetTitle>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 px-5 py-4">
            <p className="text-sm text-muted-foreground">
              Inspect confirmed allocations, tentative holds, and maintenance
              before choosing a time. Capacity is read only here.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={mode === "resources" ? "default" : "outline"}
                onClick={() => setMode("resources")}
              >
                Rooms and equipment
              </Button>
              <Button
                variant={mode === "personal" ? "default" : "outline"}
                onClick={() => setMode("personal")}
              >
                My capacity
              </Button>
              {peopleScope === "all" ? (
                <Button
                  variant={mode === "team" ? "default" : "outline"}
                  onClick={() => setMode("team")}
                >
                  People
                </Button>
              ) : null}
              {canReadWarehouses ? (
                <Button
                  variant={mode === "warehouse" ? "default" : "outline"}
                  onClick={() => setMode("warehouse")}
                >
                  Warehouse work
                </Button>
              ) : null}
            </div>
            {mode === "resources" && resources.isError ? (
              <p className="text-sm text-destructive">
                {getErrorMessage(resources.error)}
              </p>
            ) : null}
            {mode === "resources" ? (
              <div className="space-y-1">
                <Label htmlFor="capacity-resource">Resource</Label>
                <Select
                  value={selectedId ? String(selectedId) : undefined}
                  onValueChange={(value) => setResourceId(Number(value))}
                >
                  <SelectTrigger id="capacity-resource" className="w-full">
                    <SelectValue placeholder="Select a resource" />
                  </SelectTrigger>
                  <SelectContent>
                    {resources.data?.map((resource) => (
                      <SelectItem key={resource.id} value={String(resource.id)}>
                        {resource.name} · {resource.kind} ·{" "}
                        {resource.location ?? "No location"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {mode === "team" ? (
              <div className="space-y-2">
                <Label htmlFor="capacity-member-search">Person</Label>
                <Input
                  id="capacity-member-search"
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                  placeholder="Search people"
                />
                <Select
                  value={membershipId ? String(membershipId) : undefined}
                  onValueChange={(value) => setMembershipId(Number(value))}
                >
                  <SelectTrigger aria-label="Select person" className="w-full">
                    <SelectValue placeholder="Select a person" />
                  </SelectTrigger>
                  <SelectContent>
                    {(people.data?.data ?? [])
                      .filter(
                        (person) => person.organizationMembershipId !== null,
                      )
                      .map((person) => (
                        <SelectItem
                          key={person.organizationPersonId}
                          value={String(person.organizationMembershipId)}
                        >
                          {person.displayName ??
                            `${person.firstName} ${person.lastName}`.trim()}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {people.data?.pageInfo.hasMore ? (
                  <p className="text-xs text-muted-foreground">
                    Search by name to find more people.
                  </p>
                ) : null}
              </div>
            ) : null}
            {mode === "warehouse" ? (
              <div className="space-y-2">
                <Label htmlFor="capacity-warehouse">Warehouse</Label>
                <Select
                  value={
                    selectedWarehouseId
                      ? String(selectedWarehouseId)
                      : undefined
                  }
                  onValueChange={(value) => setWarehouseId(Number(value))}
                >
                  <SelectTrigger id="capacity-warehouse" className="w-full">
                    <SelectValue placeholder="Select a warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.data?.items.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.name} · {item.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {warehouses.isError ? (
                  <p className="text-sm text-destructive">
                    {getErrorMessage(warehouses.error)}
                  </p>
                ) : null}
                {warehouses.data &&
                warehouses.data.total > warehouses.data.items.length ? (
                  <p className="text-xs text-muted-foreground">
                    The first 100 permitted warehouses are shown.
                  </p>
                ) : null}
              </div>
            ) : null}
            {mode !== "warehouse" ? (
              <CapacityWindowFields
                start={start}
                end={end}
                onStartChange={setStart}
                onEndChange={setEnd}
              />
            ) : null}
            {mode === "resources" ? (
              <div className="space-y-1">
                <Label htmlFor="capacity-units">Units needed</Label>
                <Input
                  id="capacity-units"
                  type="number"
                  min={1}
                  max={1000}
                  value={units}
                  onChange={(event) => setUnits(Number(event.target.value))}
                />
              </div>
            ) : null}
            {mode === "resources" && !input ? (
              <p className="text-sm text-muted-foreground">
                Choose a resource and a valid window of up to 31 days.
              </p>
            ) : null}
            {mode === "personal" && !personalInput ? (
              <p className="text-sm text-muted-foreground">
                Choose a valid personal capacity window of up to 24 hours.
              </p>
            ) : null}
            {mode === "team" && !membershipId ? (
              <p className="text-sm text-muted-foreground">
                Select a person to inspect permitted free or busy capacity.
              </p>
            ) : null}
            {(
              mode === "resources"
                ? capacity.isLoading
                : mode === "personal"
                  ? personal.isLoading
                  : mode === "team"
                    ? team.isLoading
                    : warehouse.isLoading
            ) ? (
              <p className="text-sm text-muted-foreground">Checking capacity</p>
            ) : null}
            {mode === "resources" && capacity.isError ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive">
                  {getErrorMessage(capacity.error)}
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    void capacity.refetch();
                  }}
                >
                  Retry
                </Button>
              </div>
            ) : null}
            {mode === "personal" && personal.isError ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive">
                  {getErrorMessage(personal.error)}
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    void personal.refetch();
                  }}
                >
                  Retry
                </Button>
              </div>
            ) : null}
            {mode === "team" && team.isError ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive">
                  {getErrorMessage(team.error)}
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    void team.refetch();
                  }}
                >
                  Retry
                </Button>
              </div>
            ) : null}
            {mode === "warehouse" && warehouse.isError ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive">
                  {getErrorMessage(warehouse.error)}
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    void warehouse.refetch();
                  }}
                >
                  Retry
                </Button>
              </div>
            ) : null}
            {mode === "warehouse" && warehouse.data ? (
              <div className="space-y-3 rounded-md border p-3">
                <p className="text-sm font-medium">
                  {warehouse.data.warehouseName} ·{" "}
                  {warehouse.data.schedulingState}
                </p>
                <p className="text-xs text-muted-foreground">
                  {warehouse.data.explanation}
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p>Pending picks: {warehouse.data.pendingPicks}</p>
                  <p>Active picks: {warehouse.data.activePicks}</p>
                  <p>Pending putaways: {warehouse.data.pendingPutaways}</p>
                  <p>Active putaways: {warehouse.data.activePutaways}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Read at{" "}
                  {new Date(warehouse.data.evaluatedAt).toLocaleString()}.
                  Time-slot capacity stays unknown until Inventory schedules
                  this work.
                </p>
              </div>
            ) : null}
            {mode === "personal" && personal.data ? (
              <>
                <p className="text-xs text-muted-foreground">
                  {personal.data.coverage === "complete"
                    ? "Current source coverage"
                    : "Partial source coverage; capacity may be unknown"}{" "}
                  · evaluated{" "}
                  {new Date(personal.data.evaluatedAt).toLocaleString()}
                </p>
                {personal.data.slices.map((slice) => (
                  <div
                    key={slice.start}
                    className="space-y-1 rounded-md border p-3"
                  >
                    <p className="text-sm font-medium">
                      {new Date(slice.start).toLocaleTimeString()} –{" "}
                      {new Date(slice.end).toLocaleTimeString()}
                    </p>
                    <p className="text-sm">
                      {slice.state.replaceAll("_", " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {slice.explanation}
                    </p>
                  </div>
                ))}
              </>
            ) : null}
            {mode === "team" && team.data ? (
              <>
                <p className="text-xs text-muted-foreground">
                  {team.data.coverage === "complete"
                    ? "Current source coverage"
                    : "Partial source coverage; capacity may be unknown"}{" "}
                  · individual reasons stay private
                </p>
                {team.data.slices.map((slice) => (
                  <div
                    key={slice.start}
                    className="space-y-1 rounded-md border p-3"
                  >
                    <p className="text-sm font-medium">
                      {new Date(slice.start).toLocaleTimeString()} –{" "}
                      {new Date(slice.end).toLocaleTimeString()}
                    </p>
                    <p className="text-sm">
                      {slice.state.replaceAll("_", " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {slice.explanation}
                    </p>
                  </div>
                ))}
              </>
            ) : null}
            {mode === "resources" && capacity.data ? (
              <>
                <p className="text-xs text-muted-foreground">
                  {capacity.data.coverage === "complete"
                    ? "Complete Calendar-owned resource coverage"
                    : "Partial coverage; owner state needs confirmation"}{" "}
                  · evaluated{" "}
                  {new Date(capacity.data.evaluatedAt).toLocaleString()}
                </p>
                {capacity.data.slices.map((slice, index) => (
                  <div
                    key={`${slice.start}-${index}`}
                    className="space-y-1 rounded-md border p-3"
                  >
                    <p className="text-sm font-medium">
                      {new Date(slice.start).toLocaleString()} –{" "}
                      {new Date(slice.end).toLocaleString()}
                    </p>
                    <p className="text-sm">
                      {slice.state.replaceAll("_", " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {slice.availableUnits === null
                        ? "Availability unknown"
                        : `${slice.availableUnits} usable units for this request · ${slice.confirmedUnits} confirmed`}
                      {slice.tentativeUnits
                        ? ` · ${slice.tentativeUnits} tentative`
                        : ""}
                      {slice.proposedUnits
                        ? ` · ${slice.proposedUnits} proposed`
                        : ""}
                    </p>
                    {slice.reasons.length > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Constraints:{" "}
                        {slice.reasons
                          .map((reason) => reason.replaceAll("_", " "))
                          .join(", ")}
                      </p>
                    ) : null}
                  </div>
                ))}
              </>
            ) : null}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
