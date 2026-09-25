"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { PageState } from "@/components/shared/page-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { useCursorPager } from "@/components/ui/table-pagination";
import { useAccess, useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
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
  const [revoking, setRevoking] = useState<ProxyAccess | null>(null);
  const pager = useCursorPager();
  const { data: session } = useSession();
  const { data: access } = useAccess();

  // Keyset endpoint: the `page` this used to send was ignored, so rows past
  // the first 20 were unreachable.
  const { data, isLoading, isError, error, refetch } = useOrgDelegations({ cursor: pager.cursor, limit: 20 });
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
        form.reset();
        setSheetOpen(false);
      },
    });
  }

  // The backend lets only the grantor or the org owner revoke; anyone else
  // with hr:workflows:manage got a 403 from this button.
  function canRevoke(row: ProxyAccess) {
    return (
      canManage &&
      !isExpired(row.endsAt) &&
      (access?.isOrgOwner === true || row.grantorUserId === session?.user?.id)
    );
  }

  function handleConfirmRevoke() {
    if (!revoking) return;
    revokeProxy.mutate(revoking.id, { onSuccess: () => setRevoking(null) });
  }

  function handleRevokeDialogChange(open: boolean) {
    if (!open) setRevoking(null);
  }

  function handleNext() {
    pager.goNext(data?.pagination.nextCursor);
  }

  const pageState = usePageState({ permission: "hr:workflows:manage", isLoading, isError, error });

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
        canRevoke(row) ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setRevoking(row)}
          >
            Revoke
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      {canManage && (
        <div className="flex items-center justify-end mb-4">
          <Button onClick={handleOpenSheet} size="sm">
            <PlusIcon size={16} className="mr-1.5" />
            Grant Proxy
          </Button>
        </div>
      )}
      <PageState
        resolution={pageState}
        loading={<DataTableSkeleton columns={5} className="flex-1" />}
        onRetry={handleRetry}
        className="flex-1"
      >
      <DataTable
        className="flex-1 min-h-0"
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
        pagination={{
          mode: "cursor",
          pageSize: 20,
          hasMore: data?.pagination.hasMore ?? false,
          hasPrevious: pager.hasPrevious,
          onNext: handleNext,
          onPrevious: pager.goPrevious,
        }}
      />
      </PageState>
      <ConfirmDialog
        open={revoking !== null}
        onOpenChange={handleRevokeDialogChange}
        title="Revoke proxy access?"
        description={
          revoking
            ? `${resolveMemberName(revoking.proxyUserId)} immediately stops acting for ${resolveMemberName(revoking.grantorUserId)}.`
            : ""
        }
        confirmLabel="Revoke"
        destructive
        isPending={revokeProxy.isPending}
        keepOpenOnConfirm
        onConfirm={handleConfirmRevoke}
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
              </SheetBody>
              <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
                <div className="grid w-full grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                  <LoadingButton type="submit" isPending={grantProxy.isPending}>
                    Grant Access
                  </LoadingButton>
                </div>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </>
  );
}
