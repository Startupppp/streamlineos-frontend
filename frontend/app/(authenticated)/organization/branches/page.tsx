"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GitBranch, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useOrgBranches,
  useBusinessUnits,
  useCreateOrgBranch,
  useUpdateOrgBranch,
  useDeleteOrgBranch,
} from "@/lib/api/hooks/org-hierarchy";
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
import type { OrgBranch } from "@/types/org-hierarchy";

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9]+$/, "Only alphanumeric characters"),
  businessUnitId: z.string().optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  address: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
});

type FormValues = z.infer<typeof formSchema>;
const EMPTY: FormValues = { name: "", code: "", businessUnitId: "", city: "", state: "", country: "", address: "", phone: "", email: "" };

function BranchForm({
  defaultValues,
  businessUnits,
  onSubmit,
  isPending,
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
      <form id="branch-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
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
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. MUM"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="businessUnitId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Unit</FormLabel>
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
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
                  <Input placeholder="+91 00000 00000" {...field} />
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
        <SheetFooter>
          <Button type="submit" form="branch-form" disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </SheetFooter>
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

  const businessUnits = (busData ?? []).map((b) => ({ id: b.id, name: b.name }));
  const active = (branches ?? []).filter((b) => b.status !== "ARCHIVED" && !b.deletedAt);

  function handleCreate(values: FormValues) {
    create.mutate(
      {
        name: values.name,
        code: values.code.toUpperCase(),
        businessUnitId: values.businessUnitId || undefined,
        city: values.city || undefined,
        state: values.state || undefined,
        country: values.country || undefined,
        address: values.address || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
        managerUserId: undefined,
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
  }

  function handleUpdate(values: FormValues) {
    if (!editing) return;
    update.mutate(
      {
        id: editing.id,
        name: values.name,
        code: values.code.toUpperCase(),
        businessUnitId: values.businessUnitId || undefined,
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
  }

  function handleDelete() {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: () => {
        toast.success("Branch deleted");
        setDeleting(null);
      },
      onError: (err) => toast.error(getApiError(err)),
    });
  }

  return (
    <PageWrapper
      title="Branches"
      subtitle="Physical or regional office branches within your organization."
      actions={
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Branch
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : active.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-60 gap-3 text-muted-foreground">
          <GitBranch className="h-10 w-10 opacity-30" />
          <p className="text-sm">No branches yet</p>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Branch
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {active.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{b.code}</code>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {[b.city, b.state, b.country].filter(Boolean).join(", ") || "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={b.status === "ACTIVE" ? "outline" : "secondary"}
                    className={
                      b.status === "ACTIVE"
                        ? "text-green-700 border-green-200 bg-green-50 dark:bg-green-900/20 dark:text-green-400"
                        : ""
                    }
                  >
                    {b.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(b)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(b)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Branch</SheetTitle>
          </SheetHeader>
          <BranchForm businessUnits={businessUnits} onSubmit={handleCreate} isPending={create.isPending} />
        </SheetContent>
      </Sheet>

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Branch</SheetTitle>
          </SheetHeader>
          {editing && (
            <BranchForm
              defaultValues={{
                name: editing.name,
                code: editing.code,
                businessUnitId: editing.businessUnitId ?? "",
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
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete Branch"
        description={`Are you sure you want to delete "${deleting?.name}"?`}
        onConfirm={handleDelete}
        isPending={remove.isPending}
        destructive
      />
    </PageWrapper>
  );
}
