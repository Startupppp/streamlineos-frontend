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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { FileText, Plus, ShieldAlert } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import { isApiError } from "@/lib/api-client";
import {
  useDataRequests,
  useCreateDataRequest,
  useApproveDataRequest,
  useProcessDataRequest,
  type DataRequest,
} from "../hooks/use-retention";

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

  const { data, isLoading } = useDataRequests({ page, limit: 20 });
  const createRequest = useCreateDataRequest();
  const approveRequest = useApproveDataRequest();
  const processRequest = useProcessDataRequest();

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
      cell: (row) => <span className="text-sm">{row.subjectUserId}</span>,
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleApprove(row.id)}
                disabled={approveRequest.isPending}
              >
                Approve
              </Button>
            )}
            {row.status === "approved" && (
              <Button
                size="sm"
                onClick={() => handleProcess(row.id)}
                disabled={processRequest.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Process
              </Button>
            )}
          </div>
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
      {processError && (
        <div className="flex items-start gap-2 p-3 mb-4 border border-orange-200 bg-orange-50 rounded-lg text-sm text-orange-800">
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
          <Button onClick={handleOpenSheet} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-1.5" />
            New Request
          </Button>
        )}
      </div>
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        getRowKey={(row) => row.id}
        emptyState={
          <div className="flex flex-col items-center py-12">
            <FileText className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No data requests found.</p>
          </div>
        }
        pagination={{ mode: "server", page, pageSize: 20, total: data?.total ?? 0, onPageChange: setPage }}
      />
      <Sheet open={sheetOpen} onOpenChange={(v) => !v && setSheetOpen(false)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Data Request</SheetTitle>
            <SheetDescription>Submit a GDPR-style data export, anonymization, or deletion request.</SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreate)} className="mt-4 space-y-4">
              <FormField
                control={form.control}
                name="subjectUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject User ID</FormLabel>
                    <FormControl>
                      <Input placeholder="user-uuid" {...field} />
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
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                <LoadingButton type="submit" isPending={createRequest.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Submit
                </LoadingButton>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </>
  );
}
