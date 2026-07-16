"use client";

import { useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, Plane, MapPin, Calendar, DollarSign, CheckCircle2, Clock, XCircle, Building } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { HrSheet } from "@/features/hr/hr-sheet";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useMyTravelRequests, useCreateTravelRequest, type TravelRequest } from "@/hooks/api/hr";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { format } from "date-fns";

const travelSchema = z.object({
  purpose: z.string().min(1, "Purpose is required"),
  destination: z.string().min(1, "Destination is required"),
  departureDate: z.string().min(1, "Departure date is required"),
  returnDate: z.string().min(1, "Return date is required"),
  flightRequired: z.boolean(),
  hotelRequired: z.boolean(),
  advanceRequired: z.boolean(),
  estimatedCost: z.string().optional(),
  perDiem: z.string().optional(),
});

type TravelFormValues = z.infer<typeof travelSchema>;

const STATUS_STEPS = [
  { key: "PENDING", label: "Submitted" },
  { key: "MANAGER_APPROVED", label: "Manager Approved" },
  { key: "FINANCE_APPROVED", label: "Finance Approved" },
] as const;

function getStatusConfig(status: TravelRequest["status"]) {
  switch (status) {
    case "FINANCE_APPROVED":
    case "COMPLETED":
      return {
        label: status === "COMPLETED" ? "Completed" : "Finance Approved",
        className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
        icon: <CheckCircle2 className="h-3 w-3" />,
      };
    case "MANAGER_APPROVED":
      return {
        label: "Manager Approved",
        className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
        icon: <CheckCircle2 className="h-3 w-3" />,
      };
    case "REJECTED":
      return {
        label: "Rejected",
        className: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30",
        icon: <XCircle className="h-3 w-3" />,
      };
    default:
      return {
        label: "Pending",
        className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
        icon: <Clock className="h-3 w-3" />,
      };
  }
}

function TravelLoading() {
  return (
    <PageWrapper title="Travel Requests" subtitle="Plan and track your business travel">
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}

function StatusPipeline({ status }: { status: TravelRequest["status"] }) {
  const activeIdx = STATUS_STEPS.findIndex((s) => s.key === status);
  return (
    <div className="flex items-center gap-0 mb-6">
      {STATUS_STEPS.map((step, idx) => {
        const isActive = idx <= activeIdx && status !== "REJECTED";
        const isLast = idx === STATUS_STEPS.length - 1;
        return (
          <div key={step.key} className="flex items-center flex-1">
            <div
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                isActive
                  ? "bg-primary/10 border-primary/30 text-foreground"
                  : "bg-muted border-border text-muted-foreground",
              )}
            >
              <div className={cn("h-2 w-2 rounded-full", isActive ? "bg-primary" : "bg-muted-foreground/30")} />
              {step.label}
            </div>
            {!isLast && (
              <div className={cn("flex-1 h-px mx-1", isActive ? "bg-primary/30" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TravelCard({ request }: { request: TravelRequest }) {
  const cfg = getStatusConfig(request.status);
  return (
    <motion.div variants={fadeUp}>
      <Card className="bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Plane className="h-4 w-4 text-foreground" />
              </div>
              <div className="min-w-0">
                <TruncatedText text={request.purpose} className="text-sm font-semibold text-foreground" />
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                  <TruncatedText text={request.destination} className="text-xs text-muted-foreground" />
                </div>
              </div>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
                cfg.className,
              )}
            >
              {cfg.icon}
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                {format(new Date(request.departureDate), "MMM d")} –{" "}
                {format(new Date(request.returnDate), "MMM d, yyyy")}
              </span>
            </div>
            {request.estimatedCost && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                <span>₹{Number(request.estimatedCost).toLocaleString("en-IN")}</span>
              </div>
            )}
            {request.advanceRequired && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground">
                <Building className="h-2.5 w-2.5" />
                Advance
              </span>
            )}
          </div>
          {request.status === "REJECTED" && request.rejectionReason && (
            <p className="mt-2 text-xs text-rose-600 bg-rose-50 rounded-lg px-2 py-1 border border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30">
              {request.rejectionReason}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function TravelPage() {
  const { data: requests, isLoading } = useMyTravelRequests();
  const createRequest = useCreateTravelRequest();
  const [sheetOpen, setSheetOpen] = useState(false);

  const form = useForm<TravelFormValues>({
    resolver: zodResolver(travelSchema),
    defaultValues: {
      purpose: "",
      destination: "",
      departureDate: "",
      returnDate: "",
      flightRequired: false,
      hotelRequired: false,
      advanceRequired: false,
      estimatedCost: "",
      perDiem: "",
    },
  });

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (!open) form.reset();
      setSheetOpen(open);
    },
    [form],
  );

  const handleFlightRequiredChange = useCallback(
    (v: boolean) => form.setValue("flightRequired", v),
    [form],
  );

  const handleHotelRequiredChange = useCallback(
    (v: boolean) => form.setValue("hotelRequired", v),
    [form],
  );

  const handleAdvanceRequiredChange = useCallback(
    (v: boolean) => form.setValue("advanceRequired", v),
    [form],
  );

  const handleSubmit = useCallback(() => {
    void form.handleSubmit((values) => {
      toast.promise(
        createRequest.mutateAsync({
          purpose: values.purpose,
          destination: values.destination,
          departureDate: values.departureDate,
          returnDate: values.returnDate,
          flightRequired: values.flightRequired,
          hotelRequired: values.hotelRequired,
          advanceRequired: values.advanceRequired,
          estimatedCost: values.estimatedCost || undefined,
          perDiem: values.perDiem || undefined,
        }),
        {
          loading: "Submitting travel request...",
          success: () => {
            setSheetOpen(false);
            form.reset();
            return "Travel request submitted";
          },
          error: (e: unknown) => getErrorMessage(e),
        },
      );
    })();
  }, [form, createRequest]);

  if (isLoading) return <TravelLoading />;

  return (
    <PageWrapper
      title="Travel Requests"
      subtitle="Plan and track your business travel"
      badge={undefined}
      actions={
        <Button
          onClick={handleOpenSheet}
        >
          <Plus className="h-4 w-4 mr-2" />
          Request Travel
        </Button>
      }
    >
      {!requests?.length ? (
        <EmptyState
          illustrationPreset="travel"
          title="No travel requests yet"
          description="Submit a travel request to get started."
          action={{ label: "Request Travel", onClick: handleOpenSheet }}
        />
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          <StatusPipeline status={requests[0].status} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {requests.map((r) => (
              <TravelCard key={r.id} request={r} />
            ))}
          </div>
        </motion.div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title="Request Travel"
        description="Fill in the details for your business travel"
        onSubmit={handleSubmit}
        submitLabel="Submit Request"
        isPending={createRequest.isPending}
      >
        <div className="space-y-1.5">
          <Label htmlFor="purpose">
            Purpose <span className="text-destructive">*</span>
          </Label>
          <Input
            id="purpose"
            placeholder="Conference, client visit, training..."
            {...form.register("purpose")}
          />
          {form.formState.errors.purpose && (
            <p className="text-xs text-destructive">{form.formState.errors.purpose.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="destination">
            Destination <span className="text-destructive">*</span>
          </Label>
          <Input
            id="destination"
            placeholder="City, Country"
            {...form.register("destination")}
          />
          {form.formState.errors.destination && (
            <p className="text-xs text-destructive">{form.formState.errors.destination.message}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="departureDate">
              Departure <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="departureDate"
              control={form.control}
              render={({ field }) => (
                <DatePicker id="departureDate" value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="text-sm" />
              )}
            />
            {form.formState.errors.departureDate && (
              <p className="text-xs text-destructive">{form.formState.errors.departureDate.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="returnDate">
              Return <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="returnDate"
              control={form.control}
              render={({ field }) => (
                <DatePicker id="returnDate" value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="text-sm" />
              )}
            />
            {form.formState.errors.returnDate && (
              <p className="text-xs text-destructive">{form.formState.errors.returnDate.message}</p>
            )}
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border/40">
            <Label htmlFor="flightRequired" className="cursor-pointer">
              Flight required
            </Label>
            <Switch
              id="flightRequired"
              checked={form.watch("flightRequired")}
              onCheckedChange={handleFlightRequiredChange}
            />
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border/40">
            <Label htmlFor="hotelRequired" className="cursor-pointer">
              Hotel required
            </Label>
            <Switch
              id="hotelRequired"
              checked={form.watch("hotelRequired")}
              onCheckedChange={handleHotelRequiredChange}
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <Label htmlFor="advanceRequired" className="cursor-pointer">
              Advance required
            </Label>
            <Switch
              id="advanceRequired"
              checked={form.watch("advanceRequired")}
              onCheckedChange={handleAdvanceRequiredChange}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="estimatedCost">Estimated Cost (₹)</Label>
          <Input
            id="estimatedCost"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            {...form.register("estimatedCost")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="perDiem">Per Diem (₹/day)</Label>
          <Input
            id="perDiem"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            {...form.register("perDiem")}
          />
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
