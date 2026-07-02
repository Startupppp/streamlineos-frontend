"use client";

import { useState, useCallback, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Plus, Pencil, Trash2, Archive, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import {
  useOrgLocations,
  useCreateOrgLocation,
  useUpdateOrgLocation,
  useDeleteOrgLocation,
} from "@/hooks/api/org-hierarchy";
import { getApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SkeletonTable } from "@/components/shared/skeletons/skeleton-table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OrgLocation, LocationType } from "@/types/org-hierarchy";

const LOCATION_TYPE_ENUM = ["OFFICE", "WAREHOUSE", "STORE", "FACTORY", "REMOTE"] as const;

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  type: z.enum(LOCATION_TYPE_ENUM),
  address: z.string().trim().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

function LocationForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: FormValues;
  onSubmit: (v: FormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues ?? { name: "", type: "OFFICE" as const, address: "" },
  });

  return (
    <Form {...form}>
      <form id="location-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Mumbai Office" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {LOCATION_TYPE_ENUM.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0) + t.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="Full address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

function TypeBadge({ type }: { type: LocationType }) {
  const colors: Record<LocationType, string> = {
    OFFICE: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400",
    WAREHOUSE: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400",
    STORE: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400",
    FACTORY: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400",
    REMOTE: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400",
  };
  return (
    <Badge variant="outline" className={cn("h-4 px-1.5 py-0 text-[9px]", colors[type])}>
      {type.charAt(0) + type.slice(1).toLowerCase()}
    </Badge>
  );
}

export default function OrgLocationsPage() {
  const { data: locations, isLoading } = useOrgLocations();
  const create = useCreateOrgLocation();
  const update = useUpdateOrgLocation();
  const remove = useDeleteOrgLocation();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<OrgLocation | null>(null);
  const [deleting, setDeleting] = useState<OrgLocation | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");

  const allLocations = locations ?? [];
  const active = allLocations.filter((l) => l.status !== "ARCHIVED");
  const archived = allLocations.filter((l) => l.status === "ARCHIVED");
  const displayed = showArchived ? archived : active;
  const filtered = search
    ? displayed.filter((l) => {
        const q = search.toLowerCase();
        return (
          l.name.toLowerCase().includes(q) ||
          (l.address ?? "").toLowerCase().includes(q)
        );
      })
    : displayed;

  const handleCreate = useCallback(
    (values: FormValues) => {
      create.mutate(
        { name: values.name, type: values.type, address: values.address || undefined },
        {
          onSuccess: () => {
            toast.success("Location created");
            setShowCreate(false);
          },
          onError: (err) => toast.error(getApiError(err)),
        },
      );
    },
    [create],
  );

  const handleUpdate = useCallback(
    (values: FormValues) => {
      if (!editing) return;
      update.mutate(
        { id: editing.id, name: values.name, type: values.type, address: values.address || undefined },
        {
          onSuccess: () => {
            toast.success("Location updated");
            setEditing(null);
          },
          onError: (err) => toast.error(getApiError(err)),
        },
      );
    },
    [editing, update],
  );

  const handleArchive = useCallback(
    (l: OrgLocation) => {
      update.mutate(
        { id: l.id, status: "ARCHIVED" },
        {
          onSuccess: () => toast.success("Location archived"),
          onError: (err) => toast.error(getApiError(err)),
        },
      );
    },
    [update],
  );

  const handleRestore = useCallback(
    (l: OrgLocation) => {
      update.mutate(
        { id: l.id, status: "ACTIVE" },
        {
          onSuccess: () => toast.success("Location restored"),
          onError: (err) => toast.error(getApiError(err)),
        },
      );
    },
    [update],
  );

  const handleDelete = useCallback(() => {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: () => {
        toast.success("Location deleted");
        setDeleting(null);
      },
      onError: (err) => toast.error(getApiError(err)),
    });
  }, [deleting, remove]);

  const handleOpenCreate = useCallback(() => setShowCreate(true), []);
  const handleToggleArchived = useCallback(() => setShowArchived((v) => !v), []);
  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value), []);

  function makeRestoreHandler(loc: OrgLocation) { return () => handleRestore(loc); }
  function makeArchiveHandler(loc: OrgLocation) { return () => handleArchive(loc); }
  function makeSetEditingHandler(loc: OrgLocation) { return () => setEditing(loc); }
  function makeSetDeletingHandler(loc: OrgLocation) { return () => setDeleting(loc); }
  function handleEditSheetOpenChange(open: boolean) { if (!open) setEditing(null); }
  function handleDeleteDialogOpenChange(open: boolean) { if (!open) setDeleting(null); }

  return (
    <PageWrapper
      title="Locations"
      subtitle="Physical work locations and offices used by your organization."
      actions={
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Location
        </Button>
      }
      filters={
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search locations…"
              value={search}
              onChange={handleSearchChange}
              className="pl-8 h-8 text-xs max-w-[240px]"
            />
          </div>
          {archived.length > 0 && (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleToggleArchived}>
              <Archive className="h-4 w-4 mr-1.5" />
              {showArchived ? "Show Active" : `Archived (${archived.length})`}
            </Button>
          )}
        </div>
      }
    >
      {isLoading ? (
        <SkeletonTable rows={5} columns={5} />
      ) : filtered.length === 0 ? (
        search ? (
          <EmptyState
            illustration={<MapPin className="h-8 w-8 text-muted-foreground/40" />}
            title={`No locations matching "${search}"`}
            description="Try a different search term."
            compact
            className="min-h-[200px]"
          />
        ) : showArchived ? (
          <EmptyState
            illustration={<Archive className="h-8 w-8 text-muted-foreground/40" />}
            title="No archived locations"
            compact
            className="min-h-[200px]"
          />
        ) : (
          <EmptyState
            illustration={<MapPin className="h-8 w-8 text-muted-foreground/40" />}
            title="No locations yet"
            description="Create your first location to get started."
            action={{ label: "Add Location", onClick: handleOpenCreate }}
            className="min-h-[40vh]"
          />
        )
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[620px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Name</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Type</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Address</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Status</TableHead>
                  <TableHead className="w-28 px-2 py-1.5" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => (
                  <TableRow key={l.id} className={cn("h-8", l.status === "ARCHIVED" && "opacity-60")}>
                    <TableCell className="font-medium px-2 py-1 text-[11px]">{l.name}</TableCell>
                    <TableCell className="px-2 py-1">
                      <TypeBadge type={l.type} />
                    </TableCell>
                    <TableCell className="text-muted-foreground px-2 py-1 text-[11px] max-w-[250px] truncate">
                      {l.address ?? "—"}
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <Badge
                        variant={l.status === "ACTIVE" ? "outline" : "secondary"}
                        className={cn(
                          "h-4 px-1.5 py-0 text-[9px]",
                          l.status === "ACTIVE"
                            ? "text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400"
                            : l.status === "ARCHIVED"
                              ? "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
                              : ""
                        )}
                      >
                        {l.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <div className="flex items-center gap-1">
                        {l.status === "ARCHIVED" ? (
                          <>
                            <Button variant="ghost" size="sm" onClick={makeRestoreHandler(l)} title="Restore">
                              <RotateCcw className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={makeSetDeletingHandler(l)} title="Delete permanently">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="sm" onClick={makeSetEditingHandler(l)} title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={makeArchiveHandler(l)} title="Archive">
                              <Archive className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-md">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>New Location</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <LocationForm onSubmit={handleCreate} isPending={create.isPending} />
          </div>
          <div className="shrink-0 px-6 py-4 border-t flex items-center justify-end gap-2">
            <SheetClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </SheetClose>
            <Button size="sm" type="submit" form="location-form" disabled={create.isPending}>
              {create.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!editing} onOpenChange={handleEditSheetOpenChange}>
        <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-md">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>Edit Location</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {editing && (
              <LocationForm
                defaultValues={{
                  name: editing.name,
                  type: editing.type,
                  address: editing.address ?? "",
                }}
                onSubmit={handleUpdate}
                isPending={update.isPending}
              />
            )}
          </div>
          <div className="shrink-0 px-6 py-4 border-t flex items-center justify-end gap-2">
            <SheetClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </SheetClose>
            <Button size="sm" type="submit" form="location-form" disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={handleDeleteDialogOpenChange}
        title="Delete Location"
        description={`Permanently delete "${deleting?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        isPending={remove.isPending}
        destructive
      />
    </PageWrapper>
  );
}
