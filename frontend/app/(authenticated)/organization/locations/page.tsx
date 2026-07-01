"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Plus, Pencil, Trash2, Archive, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  useOrgLocations,
  useCreateOrgLocation,
  useUpdateOrgLocation,
  useDeleteOrgLocation,
} from "@/hooks/api/org-hierarchy";
import { getApiError } from "@/lib/api-client";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
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
        <SheetFooter>
          <Button type="submit" form="location-form" disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </SheetFooter>
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
    <Badge variant="outline" className={colors[type]}>
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

  const allLocations = locations ?? [];
  const active = allLocations.filter((l) => l.status !== "ARCHIVED");
  const archived = allLocations.filter((l) => l.status === "ARCHIVED");
  const displayed = showArchived ? archived : active;

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
        <div className="flex items-center gap-2">
          {archived.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleToggleArchived}>
              <Archive className="h-4 w-4 mr-1.5" />
              {showArchived ? "Show Active" : `Archived (${archived.length})`}
            </Button>
          )}
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Location
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        showArchived ? (
          <div className="flex flex-col items-center justify-center h-60 gap-3 text-muted-foreground">
            <Archive className="h-10 w-10 opacity-30" />
            <p className="text-sm">No archived locations</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-60 gap-3 text-muted-foreground">
            <MapPin className="h-10 w-10 opacity-30" />
            <p className="text-sm">No locations yet</p>
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Location
            </Button>
          </div>
        )
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayed.map((l) => (
              <TableRow key={l.id} className={l.status === "ARCHIVED" ? "opacity-60" : ""}>
                <TableCell className="font-medium">{l.name}</TableCell>
                <TableCell>
                  <TypeBadge type={l.type} />
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[250px] truncate">
                  {l.address ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={l.status === "ACTIVE" ? "outline" : "secondary"}
                    className={
                      l.status === "ACTIVE"
                        ? "text-green-700 border-green-200 bg-green-50 dark:bg-green-900/20 dark:text-green-400"
                        : l.status === "ARCHIVED"
                          ? "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
                          : ""
                    }
                  >
                    {l.status}
                  </Badge>
                </TableCell>
                <TableCell>
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
      )}

      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="p-0 flex flex-col gap-0">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>New Location</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <LocationForm onSubmit={handleCreate} isPending={create.isPending} />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!editing} onOpenChange={handleEditSheetOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit Location</SheetTitle>
          </SheetHeader>
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
