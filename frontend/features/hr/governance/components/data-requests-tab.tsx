"use client";

import { useState, useMemo } from "react";
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
import { UserCombobox } from "@/components/ui/user-combobox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { ShieldAlert } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { StateIllustration } from "@/components/illustrations";
import { useCan } from "@/hooks/api/access";
import { isApiError } from "@/lib/api-client";
import {
  useDataRequests,
  useCreateDataRequest,
  useApproveDataRequest,
  useProcessDataRequest,
  type DataRequest,
} from "../hooks/use-retention";
import { useOrgMembers } from "@/hooks/api/organization";
import {
  getUserDisplayName,
  type NamedUser,
} from "@/features/projects/shared/resolve-user-name";

const requestSchema = z.object({
  subjectUserId: z.string().min(1, "Subject user is required"),
  type: z.enum(["export", "delete", "anonymize"]),
  reason: z.string().max(2000),
});

type RequestForm = z.infer<typeof requestSchema>;

const STATUS_VARIANTS: Record<DataRequest["status"], "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  processing: "default",
  completed: "outline",
  rejected: "destructive",
};

export function DataRequestsTab() {
  const canManage = useCan("hr:retention:manage");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [processError, setProcessError] = useState<string | null>(null);

  const { data, isLoading, isError } = useDataRequests({ page, limit: 20 });
  const { data: membersData } = useOrgMembers(1, 200);
  const createRequest = useCreateDataRequest();
  const approveRequest = useApproveDataRequest();
  const processRequest = useProcessDataRequest();

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

  const form = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: { subjectUserId: "", type: "export", reason: "" },
  });

  function handleCreate(values: RequestForm) {
    createRequest.mutate(values, { onSuccess: () => { form.reset(); setSheetOpen(false); } });
  }

  function handleApprove(id: number) {
    approveRequest.mutate(id);
  }

  function handleProcess(id: number) {
    setProcessError(null);
    processRequest.mutate(id, {
      onError: (err) => {
        if (isApiError(err) && err.status === 403) {
          setProcessError(err.message);
        }
      },
    });
  }

  function handleOpenSheet() {
    setSheetOpen(true);
  }

  const columns: DataTableColumn<DataRequest>[] = [
    {
      key: "id",
      header: "ID",
      cell: (row) => <span className="font-mono text-xs text-muted-foreground">#{row.id}</span>,
    },
    {
      key: "subjectUserId",
      header: "Subject",
      cell: (row) => <span className="text-sm">{resolveMemberName(row.subjectUserId)}</span>,
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => <Badge variant="outline">{row.type}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={STATUS_VARIANTS[row.status]}>{row.status}</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) =>
        canManage ? (
          <div className="flex items-center gap-2">
            {row.status === "pending" && (
              <LoadingButton
                variant="outline"
                size="sm"
                onClick={() => handleApprove(row.id)}
                isPending={approveRequest.isPending}
              >
                Approve
              </LoadingButton>
            )}
            {row.status === "approved" && (
              <LoadingButton
                size="sm"
                onClick={() => handleProcess(row.id)}
                isPending={processRequest.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Process
              </LoadingButton>
            )}
          </div>
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
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
        <StateIllustration preset="security" className="h-24 w-24" />
        <p className="text-sm text-muted-foreground">Failed to load data requests.</p>
      </div>
    );
  }

  return (
    <>
      {processError && (
        <div className="flex items-start gap-2 p-3 mb-4 border border-orange-200 bg-orange-50 rounded-lg text-sm text-orange-800 dark:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-300">
          <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <span className="font-medium">Blocked by Legal Hold: </span>
            {processError}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} requests</p>
        {canManage && (
          <Button onClick={handleOpenSheet} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusIcon size={16} className="mr-1.5" />
            New Request
          </Button>
        )}
      </div>
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        getRowKey={(row) => row.id}
        emptyState={
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <StateIllustration preset="documents" className="h-28 w-28" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">No data requests</p>
              <p className="text-xs text-muted-foreground">Submit GDPR-style export, anonymization, or deletion requests for employees.</p>
            </div>
            {canManage && (
              <Button onClick={handleOpenSheet} size="sm" className="mt-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                <PlusIcon size={16} className="mr-1.5" />
                New Request
              </Button>
            )}
          </div>
        }
        pagination={{ mode: "server", page, pageSize: 20, total: data?.total ?? 0, onPageChange: setPage }}
      />
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
            <SheetTitle>New Data Request</SheetTitle>
            <SheetDescription>Submit a GDPR-style data export, anonymization, or deletion request.</SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreate)} className="flex min-h-0 flex-1 flex-col">
              <SheetBody className="space-y-4 px-6 py-5">
              <FormField
                control={form.control}
                name="subjectUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <UserCombobox
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select employee"
                      />
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
                    <FormLabel>Request Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="export">Export</SelectItem>
                        <SelectItem value="anonymize">Anonymize</SelectItem>
                        <SelectItem value="delete">Delete</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe the reason..." rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </SheetBody>
              <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
                <div className="grid w-full grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                  <LoadingButton type="submit" isPending={createRequest.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    Submit
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
