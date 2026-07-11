"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { Users, Plus } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import { useOrgDelegations, useGrantProxy, useRevokeProxy, type ProxyAccess } from "../hooks/use-delegations";
import { format } from "date-fns";

const proxySchema = z.object({
  proxyUserId: z.string().min(1, "Proxy user is required"),
  scope: z.enum(["approvals", "hr_admin", "manager_tasks"]),
  startsAt: z.string().min(1, "Start date required"),
  endsAt: z.string().min(1, "End date required"),
  reason: z.string().max(1000),
});

type ProxyForm = z.infer<typeof proxySchema>;

function isExpired(endsAt: string) {
  return new Date(endsAt) < new Date();
}

export function DelegationSheet() {
  const canManage = useCan("hr:employees:manage");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useOrgDelegations({ page, limit: 20 });
  const grantProxy = useGrantProxy();
  const revokeProxy = useRevokeProxy();

  const form = useForm<ProxyForm>({
    resolver: zodResolver(proxySchema),
    defaultValues: { proxyUserId: "", scope: "approvals", startsAt: "", endsAt: "", reason: "" },
  });

  function handleGrant(values: ProxyForm) {
    grantProxy.mutate(values, { onSuccess: () => { form.reset(); setSheetOpen(false); } });
  }

  function handleRevoke(id: number) {
    revokeProxy.mutate(id);
  }

  function handleOpenSheet() {
    setSheetOpen(true);
  }

  const columns: DataTableColumn<ProxyAccess>[] = [
    {
      key: "grantorUserId",
      header: "Grantor",
      cell: (row) => <span className="text-sm">{row.grantorUserId}</span>,
    },
    {
      key: "proxyUserId",
      header: "Proxy",
      cell: (row) => <span className="text-sm">{row.proxyUserId}</span>,
    },
    {
      key: "scope",
      header: "Scope",
      cell: (row) => <Badge variant="outline">{row.scope}</Badge>,
    },
    {
      key: "endsAt",
      header: "Expires",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {format(new Date(row.endsAt), "MMM d, yyyy")}
          </span>
          {isExpired(row.endsAt) && (
            <Badge variant="secondary" className="text-xs">Expired</Badge>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) =>
        canManage && !isExpired(row.endsAt) ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => handleRevoke(row.id)}
            disabled={revokeProxy.isPending}
          >
            Revoke
          </Button>
        ) : null,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} proxies</p>
        {canManage && (
          <Button onClick={handleOpenSheet} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-1.5" />
            Grant Proxy
          </Button>
        )}
      </div>
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        getRowKey={(row) => row.id}
        emptyState={
          <div className="flex flex-col items-center py-12">
            <Users className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No proxy delegations configured.</p>
          </div>
        }
        pagination={{ mode: "server", page, pageSize: 20, total: data?.total ?? 0, onPageChange: setPage }}
      />
      <Sheet open={sheetOpen} onOpenChange={(v) => !v && setSheetOpen(false)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Grant Proxy Access</SheetTitle>
            <SheetDescription>Delegate your HR actions to another user for a defined period.</SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleGrant)} className="mt-4 space-y-4">
              <FormField
                control={form.control}
                name="proxyUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proxy User ID</FormLabel>
                    <FormControl>
                      <Input placeholder="user-uuid" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scope</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="approvals">Approvals</SelectItem>
                        <SelectItem value="hr_admin">HR Admin</SelectItem>
                        <SelectItem value="manager_tasks">Manager Tasks</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="startsAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endsAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Parental leave coverage" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                <LoadingButton type="submit" isPending={grantProxy.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Grant Access
                </LoadingButton>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </>
  );
}
