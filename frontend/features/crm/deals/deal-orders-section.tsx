"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Package, Plus, ChevronDown, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { apiClient } from "@/lib/api-client";

type OrderStatus = "CREATED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

interface Order {
  id: number;
  dealId: number;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  currency: string;
  shippingAddress: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  CREATED: "bg-muted text-muted-foreground border-0",
  PROCESSING: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-0",
  SHIPPED: "bg-amber-500/10 text-amber-700 border-0",
  DELIVERED: "bg-emerald-500/10 text-emerald-700 border-0",
  CANCELLED: "bg-red-500/10 text-red-700 border-0",
};

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  CREATED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

const createOrderSchema = z.object({
  shippingAddress: z.string().optional(),
  notes: z.string().optional(),
});

type CreateOrderForm = z.infer<typeof createOrderSchema>;

function useDealOrders(dealId: number) {
  return useQuery({
    queryKey: ["orders", "deal", dealId] as const,
    queryFn: () => apiClient.get<{ orders: Order[] }>(`/crm/deals/${dealId}/orders`),
    enabled: dealId > 0,
    staleTime: 2 * 60_000,
  });
}

function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["orders", "create"] as const,
    mutationFn: (input: { dealId: number; notes?: string; shippingAddress?: string }) =>
      apiClient.post<{ order: Order }>("/crm/orders", input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["orders", "deal", vars.dealId] });
    },
  });
}

function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["orders", "updateStatus"] as const,
    mutationFn: ({ id, status }: { id: number; status: OrderStatus; dealId: number }) =>
      apiClient.patch<{ order: Order }>(`/crm/orders/${id}/status`, { status }),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["orders", "deal", vars.dealId] });
    },
  });
}

function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["orders", "delete"] as const,
    mutationFn: ({ id }: { id: number; dealId: number }) =>
      apiClient.delete<{ success: boolean }>(`/crm/orders/${id}`),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["orders", "deal", vars.dealId] });
    },
  });
}

interface OrderCardProps {
  order: Order;
  dealId: number;
  onDeleteRequest: (id: number) => void;
}

function OrderCard({ order, dealId, onDeleteRequest }: OrderCardProps) {
  const updateStatus = useUpdateOrderStatus();
  const transitions = ORDER_STATUS_TRANSITIONS[order.status];

  const handleStatusChange = useCallback(
    (status: OrderStatus) => {
      updateStatus.mutate(
        { id: order.id, status, dealId },
        {
          onSuccess: () => toast.success(`Order status updated to ${status.toLowerCase()}`),
          onError: () => toast.error("Failed to update order status"),
        },
      );
    },
    [order.id, dealId, updateStatus],
  );

  const handleStatusMenuItemClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const status = e.currentTarget.dataset.status as OrderStatus | undefined;
      if (status) handleStatusChange(status);
    },
    [handleStatusChange],
  );

  const handleDeleteRequest = useCallback(() => {
    onDeleteRequest(order.id);
  }, [order.id, onDeleteRequest]);

  const createdDate = order.createdAt
    ? (() => {
        try {
          return format(new Date(order.createdAt), "MMM d, yyyy");
        } catch {
          return order.createdAt;
        }
      })()
    : null;

  return (
    <motion.div variants={fadeUp}>
      <Card className="bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground font-mono">
                  {order.orderNumber}
                </span>
                <Badge className={ORDER_STATUS_COLORS[order.status]}>
                  {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-sm text-muted-foreground">
                  {order.currency} {order.total.toLocaleString()}
                </span>
                {createdDate && (
                  <span className="text-xs text-muted-foreground">{createdDate}</span>
                )}
              </div>
              {order.shippingAddress && (
                <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs">
                  {order.shippingAddress}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {transitions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      disabled={updateStatus.isPending}
                    >
                      Update Status
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {transitions.map((s) => (
                      <DropdownMenuItem
                        key={s}
                        data-status={s}
                        onClick={handleStatusMenuItemClick}
                      >
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="w-7 text-destructive hover:text-destructive"
                onClick={handleDeleteRequest}
                aria-label="Delete order"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface DealOrdersSectionProps {
  dealId: number;
  dealStage: string;
}

export function DealOrdersSection({ dealId, dealStage }: DealOrdersSectionProps) {
  const isWon = dealStage === "WON" || dealStage === "CLOSED_WON";
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const { data, isLoading, isError, refetch } = useDealOrders(dealId);
  const createOrder = useCreateOrder();
  const deleteOrder = useDeleteOrder();

  const form = useForm<CreateOrderForm>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: { shippingAddress: "", notes: "" },
  });

  const handleOpenCreate = useCallback(() => {
    form.reset();
    setCreateOpen(true);
  }, [form]);

  const handleCloseCreate = useCallback(() => setCreateOpen(false), []);

  const onCreateSubmit = useCallback(
    (values: CreateOrderForm) => {
      createOrder.mutate(
        {
          dealId,
          shippingAddress: values.shippingAddress || undefined,
          notes: values.notes || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Order created");
            setCreateOpen(false);
            form.reset();
          },
          onError: () => toast.error("Failed to create order"),
        },
      );
    },
    [dealId, createOrder, form],
  );

  const handleDeleteRequest = useCallback((id: number) => {
    setDeleteTargetId(id);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTargetId === null) return;
    deleteOrder.mutate(
      { id: deleteTargetId, dealId },
      {
        onSuccess: () => {
          toast.success("Order deleted");
          setDeleteTargetId(null);
        },
        onError: () => {
          toast.error("Failed to delete order");
          setDeleteTargetId(null);
        },
      },
    );
  }, [deleteTargetId, dealId, deleteOrder]);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const handleDeleteCancel = useCallback(() => setDeleteTargetId(null), []);
  const handleDeleteOpenChange = useCallback(
    (open: boolean) => { if (!open) handleDeleteCancel(); },
    [handleDeleteCancel],
  );

  const orders = data?.orders ?? [];

  return (
    <>
      <Card className="bg-card border border-border rounded-xl shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Orders</h3>
            {orders.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                {orders.length}
              </Badge>
            )}
          </div>
          {isWon && (
            <Button
              size="sm"
              className="text-xs"
              onClick={handleOpenCreate}
            >
              <Plus className="h-3 w-3 mr-1" />
              Create Order
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
              <p className="text-sm text-muted-foreground">Failed to load orders</p>
              <Button variant="outline" size="sm" onClick={handleRetry}>Retry</Button>
            </div>
          ) : orders.length === 0 ? (
            <EmptyState
              compact
              illustrationPreset="inventory"
              title={isWon ? "No orders yet" : "Orders created when deal is won"}
              description={
                isWon
                  ? "Create your first order for this deal."
                  : "Orders are created when the deal is marked as Won."
              }
              action={isWon ? { label: "Create Order", onClick: handleOpenCreate } : undefined}
            />
          ) : (
            <motion.div
              className="space-y-3"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  dealId={dealId}
                  onDeleteRequest={handleDeleteRequest}
                />
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Order</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="shippingAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipping Address</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter shipping address (optional)"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Order notes (optional)"
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={handleCloseCreate}>
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  isPending={createOrder.isPending}
                  loadingText="Creating..."
                >
                  Create Order
                </LoadingButton>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTargetId !== null} onOpenChange={handleDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              This order will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
