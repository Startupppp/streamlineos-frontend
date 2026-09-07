"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
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
  SheetBody,
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
import { Input } from "@/components/ui/input";
import { UserCombobox } from "@/components/ui/user-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { PlusIcon } from "@animateicons/react/lucide";
import { StateIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useCan } from "@/hooks/api/access";
import { useOrgDelegations, useGrantProxy, useRevokeProxy, type ProxyAccess } from "../hooks/use-delegations";
import { useOrgMembers } from "@/hooks/api/organization";
import {
  getUserDisplayName,
  type NamedUser,
} from "@/lib/person-display";
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
  const canManage = useCan("hr:workflows:manage");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useOrgDelegations({ page, limit: 20 });
  const { data: membersData } = useOrgMembers(1, 200);
  const grantProxy = useGrantProxy();
  const revokeProxy = useRevokeProxy();

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, {
        name: member.name,
        email: member.email,
      });
    }
    return map;
  }, [membersData]);

  function resolveMemberName(userId: string) {
    const member = memberById.get(userId);
    return member ? getUserDisplayName(member) : userId;
  }

  const form = useForm<ProxyForm>({
    resolver: zodResolver(proxySchema),
    defaultValues: { proxyUserId: "", scope: "approvals", startsAt: "", endsAt: "", reason: "" },
  });

  function handleGrant(values: ProxyForm) {
    grantProxy.mutate(values, {
      onSuccess: () => {
        toast.success("Delegation granted");
        form.reset();
        setSheetOpen(false);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleRevoke(id: number) {
    revokeProxy.mutate(id);
  }

  function handleOpenSheet() {
    setSheetOpen(true);
  }

  function handleRetry() {
    void refetch();
  }

  const columns: DataTableColumn<ProxyAccess>[] = [
    {
      key: "grantorUserId",
      header: "Grantor",
      cell: (row) => <span className="text-sm">{resolveMemberName(row.grantorUserId)}</span>,
    },
    {
      key: "proxyUserId",
      header: "Proxy",
      cell: (row) => <span className="text-sm">{resolveMemberName(row.proxyUserId)}</span>,
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
          <LoadingButton
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => handleRevoke(row.id)}
            isPending={revokeProxy.isPending}
          >
            Revoke
          </LoadingButton>
        ) : null,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        className="flex-1"
        title="Couldn't load delegations"
        description={getErrorMessage(error)}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground whitespace-nowrap">
          {data?.total ?? 0} {(data?.total ?? 0) === 1 ? "proxy" : "proxies"}
        </p>
        {canManage && (
          <Button onClick={handleOpenSheet} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusIcon size={16} className="mr-1.5" />
            Grant Proxy
          </Button>
        )}
      </div>
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        getRowKey={(row) => row.id}
        emptyState={
          <EmptyState
            className="border-0 bg-transparent min-h-[40vh]"
            illustration={<StateIllustration preset="team" className="h-28 w-28" />}
            title="No proxy delegations configured"
            description="Grant proxy access to let another user act on your behalf during leave or absence."
            action={canManage ? { label: "Grant Proxy", onClick: handleOpenSheet } : undefined}
          />
        }
        pagination={{ mode: "server", page, pageSize: 20, total: data?.total ?? 0, onPageChange: setPage }}
      />
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
            <SheetTitle>Grant Proxy Access</SheetTitle>
            <SheetDescription>Delegate your HR actions to another user for a defined period.</SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form id="proxy-form" onSubmit={form.handleSubmit(handleGrant)} className="contents">
              <SheetBody className="space-y-4 px-6 py-5">
              <FormField
                control={form.control}
                name="proxyUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proxy User</FormLabel>
                    <FormControl>
                      <UserCombobox
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select proxy user"
                      />
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
              <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
                <div className="grid w-full grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                  <LoadingButton type="submit" isPending={grantProxy.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    Grant Access
                  </LoadingButton>
                </div>
              </SheetFooter>
              </SheetBody>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </>
  );
}
