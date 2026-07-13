"use client";

import { useState, useCallback, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Archive, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import {
  useOrgBranches,
  useBusinessUnits,
  useCreateOrgBranch,
  useUpdateOrgBranch,
  useDeleteOrgBranch,
} from "@/hooks/api/org-hierarchy";
import { getApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
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
import { PhoneInput } from "@/components/ui/phone-input";
import { UserCombobox } from "@/components/ui/user-combobox";
import type { OrgBranch } from "@/types/org-hierarchy";
import { RequireModule } from "@/components/auth/require-module";

const NO_BUSINESS_UNIT = "none";

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9]+$/, "Only alphanumeric characters"),
  businessUnitId: z.string().optional(),
  managerUserId: z.string().optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  address: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
});

type FormValues = z.infer<typeof formSchema>;
const EMPTY: FormValues = { name: "", code: "", businessUnitId: NO_BUSINESS_UNIT, managerUserId: "", city: "", state: "", country: "", address: "", phone: "", email: "" };

function BranchForm({
  defaultValues,
  businessUnits,
  onSubmit,
  isPending: _isPending,
}: {
  defaultValues?: FormValues;
  businessUnits: { id: string; name: string }[];
  onSubmit: (v: FormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues ?? EMPTY,
  });

  return (
    <Form {...form}>
      <form id="branch-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Mumbai HQ" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => {
              function handleCodeChange(e: ChangeEvent<HTMLInputElement>) {
                field.onChange(e.target.value.toUpperCase());
              }
              return (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. MUM" {...field} onChange={handleCodeChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          <FormField
            control={form.control}
            name="businessUnitId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Unit</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_BUSINESS_UNIT}>None</SelectItem>
                    {businessUnits.map((bu) => (
                      <SelectItem key={bu.id} value={bu.id}>
                        {bu.name}
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
            name="managerUserId"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Manager</FormLabel>
                <FormControl>
                  <UserCombobox
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Select manager…"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input placeholder="City" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl>
                  <Input placeholder="State" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input placeholder="Country" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <PhoneInput {...field} defaultCountry="IN" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="branch@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input placeholder="Full address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  );
}

export default function OrgBranchesPage() {
  const { data: branches, isLoading } = useOrgBranches();
  const { data: busData } = useBusinessUnits();
  const create = useCreateOrgBranch();
  const update = useUpdateOrgBranch();
  const remove = useDeleteOrgBranch();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<OrgBranch | null>(null);
  const [deleting, setDeleting] = useState<OrgBranch | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");

  const businessUnits = (busData?.data ?? []).map((b) => ({ id: b.id, name: b.name }));
  const allBranches = branches?.data ?? [];
  const active = allBranches.filter((b) => b.status !== "ARCHIVED" && !b.deletedAt);
  const archived = allBranches.filter((b) => b.status === "ARCHIVED" && !b.deletedAt);
  const displayed = showArchived ? archived : active;
  const filtered = search
    ? displayed.filter((b) => {
        const q = search.toLowerCase();
        return (
          b.name.toLowerCase().includes(q) ||
          b.code.toLowerCase().includes(q) ||
          (b.email ?? "").toLowerCase().includes(q)
        );
      })
    : displayed;

  const handleCreate = useCallback(
    (values: FormValues) => {
      create.mutate(
        {
          name: values.name,
          code: values.code.toUpperCase(),
          businessUnitId: values.businessUnitId === NO_BUSINESS_UNIT ? undefined : values.businessUnitId,
          managerUserId: values.managerUserId || undefined,
          city: values.city || undefined,
          state: values.state || undefined,
          country: values.country || undefined,
          address: values.address || undefined,
          phone: values.phone || undefined,
          email: values.email || undefined,
          postalCode: undefined,
        },
        {
          onSuccess: () => {
            toast.success("Branch created");
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
        {
          id: editing.id,
          name: values.name,
          code: values.code.toUpperCase(),
          businessUnitId: values.businessUnitId === NO_BUSINESS_UNIT ? undefined : values.businessUnitId,
          managerUserId: values.managerUserId || undefined,
          city: values.city || undefined,
          state: values.state || undefined,
          country: values.country || undefined,
          address: values.address || undefined,
          phone: values.phone || undefined,
          email: values.email || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Branch updated");
            setEditing(null);
          },
          onError: (err) => toast.error(getApiError(err)),
        },
      );
    },
    [editing, update],
  );

  const handleArchive = useCallback(
    (b: OrgBranch) => {
      update.mutate(
        { id: b.id, status: "ARCHIVED" },
        {
          onSuccess: () => toast.success("Branch archived"),
          onError: (err) => toast.error(getApiError(err)),
        },
      );
    },
    [update],
  );

  const handleRestore = useCallback(
    (b: OrgBranch) => {
      update.mutate(
        { id: b.id, status: "ACTIVE" },
        {
          onSuccess: () => toast.success("Branch restored"),
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
        toast.success("Branch deleted");
        setDeleting(null);
      },
      onError: (err) => toast.error(getApiError(err)),
    });
  }, [deleting, remove]);

  const handleOpenCreate = useCallback(() => setShowCreate(true), []);
  const handleToggleArchived = useCallback(() => setShowArchived((v) => !v), []);
  const handleSearchChange = useCallback((v: string) => setSearch(v), []);

  function handleSearchInputChange(e: ChangeEvent<HTMLInputElement>) { handleSearchChange(e.target.value); }

  function makeRestoreHandler(branch: OrgBranch) { return () => handleRestore(branch); }
  function makeArchiveHandler(branch: OrgBranch) { return () => handleArchive(branch); }
  function makeSetEditingHandler(branch: OrgBranch) { return () => setEditing(branch); }
  function makeSetDeletingHandler(branch: OrgBranch) { return () => setDeleting(branch); }
  function handleEditSheetOpenChange(open: boolean) { if (!open) setEditing(null); }
  function handleDeleteDialogOpenChange(open: boolean) { if (!open) setDeleting(null); }

  const emptyState = search ? (
    <EmptyState
      illustrationPreset="companies"
      title={`No branches matching "${search}"`}
      description="Try a different search term."
      compact
      className="min-h-[200px]"
    />
  ) : showArchived ? (
    <EmptyState
      illustrationPreset="archive"
      title="No archived branches"
      compact
      className="min-h-[200px]"
    />
  ) : (
    <EmptyState
      illustrationPreset="companies"
      title="No branches yet"
      description="Create your first branch to get started."
      action={{ label: "Add Branch", onClick: handleOpenCreate }}
      className="min-h-[40vh]"
    />
  );

  const columns: DataTableColumn<OrgBranch>[] = [
    {
      key: "name",
      header: "Name",
      cell: (b) => <span className="font-medium">{b.name}</span>,
      sortable: true,
      sortValue: (b) => b.name,
    },
    {
      key: "code",
      header: "Code",
      cell: (b) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{b.code}</code>
      ),
    },
    {
      key: "location",
      header: "Location",
      cell: (b) => (
        <span className="text-muted-foreground">
          {[b.city, b.state, b.country].filter(Boolean).join(", ") || "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (b) => (
        <Badge
          variant={b.status === "ACTIVE" ? "outline" : "secondary"}
          className={cn(
            "h-4 px-1.5 py-0 text-[9px]",
            b.status === "ACTIVE"
              ? "text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400"
              : b.status === "ARCHIVED"
                ? "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
                : "",
          )}
        >
          {b.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-28",
      cell: (b) => (
        <div className="flex items-center gap-1">
          {b.status === "ARCHIVED" ? (
            <>
              <Button variant="ghost" size="sm" onClick={makeRestoreHandler(b)} title="Restore">
                <RotateCcw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </Button>
              <Button variant="ghost" size="sm" onClick={makeSetDeletingHandler(b)} title="Delete permanently">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={makeSetEditingHandler(b)} title="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={makeArchiveHandler(b)} title="Archive">
                <Archive className="h-4 w-4 text-muted-foreground" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <RequireModule module="HR">
    <PageWrapper
      title="Branches"
      subtitle="Branches within your organization."
      actions={
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Branch
        </Button>
      }
      filters={
        <>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input className="pl-8 h-8 text-xs max-w-[240px]" placeholder="Search branches…" value={search} onChange={handleSearchInputChange} />
          </div>
          {archived.length > 0 && (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleToggleArchived}>
              <Archive className="h-4 w-4 mr-1.5" />
              {showArchived ? "Show Active" : `Archived (${archived.length})`}
            </Button>
          )}
        </>
      }
    >
      <DataTable
        data={filtered}
        columns={columns}
        getRowKey={(b) => b.id}
        isLoading={isLoading}
        emptyState={emptyState}
        rowClassName={(b) => cn(b.status === "ARCHIVED" && "opacity-60")}
        minWidth="580px"
      />

      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-md">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>New Branch</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <BranchForm businessUnits={businessUnits} onSubmit={handleCreate} isPending={create.isPending} />
          </div>
          <div className="shrink-0 px-6 py-4 border-t">
            <div className="grid grid-cols-2 gap-2">
              <SheetClose asChild>
                <Button variant="outline" size="sm" className="w-full">Cancel</Button>
              </SheetClose>
              <Button size="sm" type="submit" form="branch-form" disabled={create.isPending} className="w-full">
                {create.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!editing} onOpenChange={handleEditSheetOpenChange}>
        <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-md">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>Edit Branch</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {editing && (
              <BranchForm
                defaultValues={{
                  name: editing.name,
                  code: editing.code,
                  businessUnitId: editing.businessUnitId ?? NO_BUSINESS_UNIT,
                  managerUserId: editing.managerUserId ?? "",
                  city: editing.city ?? "",
                  state: editing.state ?? "",
                  country: editing.country ?? "",
                  address: editing.address ?? "",
                  phone: editing.phone ?? "",
                  email: editing.email ?? "",
                }}
                businessUnits={businessUnits}
                onSubmit={handleUpdate}
                isPending={update.isPending}
              />
            )}
          </div>
          <div className="shrink-0 px-6 py-4 border-t">
            <div className="grid grid-cols-2 gap-2">
              <SheetClose asChild>
                <Button variant="outline" size="sm" className="w-full">Cancel</Button>
              </SheetClose>
              <Button size="sm" type="submit" form="branch-form" disabled={update.isPending} className="w-full">
                {update.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={handleDeleteDialogOpenChange}
        title="Delete Branch"
        description={`Permanently delete "${deleting?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        isPending={remove.isPending}
        destructive
      />
    </PageWrapper>
    </RequireModule>
  );
}
