"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { HrSheet } from "@/features/hr/hr-sheet";
import { useMotionVariants } from "@/lib/motion-variants";
import { useMyTravelRequests, useCreateTravelRequest } from "@/hooks/api/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { travelSchema, type TravelFormValues } from "@/features/hr/travel/travel-schema";
import { StatusPipeline } from "@/features/hr/travel/travel-status-helpers";
import { TravelCard } from "@/features/hr/travel/travel-card";
import { TravelRequestForm } from "@/features/hr/travel/travel-request-form";

function TravelLoading() {
  return (
    <PageWrapper
      title="Travel Requests"
      subtitle="Plan and track your business travel"
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
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

export function TravelPage() {
  const { staggerContainer } = useMotionVariants();
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
    void form.handleSubmit(
      async (values) => {
        const estimatedCost = values.estimatedCost?.trim() || undefined;
        const perDiem = values.perDiem?.trim() || undefined;
        const loadingToastId = toast.loading("Submitting travel request...");
        try {
          await createRequest.mutateAsync({
            purpose: values.purpose.trim(),
            destination: values.destination.trim(),
            departureDate: values.departureDate,
            returnDate: values.returnDate,
            flightRequired: values.flightRequired,
            hotelRequired: values.hotelRequired,
            advanceRequired: values.advanceRequired,
            estimatedCost,
            perDiem,
          });
          toast.success("Travel request submitted successfully", { id: loadingToastId });
          setSheetOpen(false);
          form.reset();
        } catch (error) {
          toast.error(getErrorMessage(error), { id: loadingToastId });
        }
      },
      (errors) => {
        const firstMessage = Object.values(errors).find(
          (err) => typeof err?.message === "string" && err.message.length > 0,
        )?.message;
        toast.error(
          typeof firstMessage === "string"
            ? firstMessage
            : "Please fix the highlighted fields and try again",
        );
      },
    )();
  }, [form, createRequest]);

  if (isLoading) return <TravelLoading />;

  return (
    <PageWrapper
      title="Travel Requests"
      subtitle="Plan and track your business travel"
      badge={undefined}
      actions={
        <Button onClick={handleOpenSheet}>
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
          className="flex flex-1 min-h-0 flex-col gap-4"
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
        <TravelRequestForm
          form={form}
          onFlightRequiredChange={handleFlightRequiredChange}
          onHotelRequiredChange={handleHotelRequiredChange}
          onAdvanceRequiredChange={handleAdvanceRequiredChange}
        />
      </HrSheet>
    </PageWrapper>
  );
}
