import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { ServiceDeliveryPage } from "@/features/hr/service-delivery/service-delivery-page";
import { prefetchHrServiceDelivery } from "@/lib/prefetch/hr";
import ServiceDeliveryLoading from "./loading";

export default async function Page() {
  const state = await prefetchHrServiceDelivery();
  return (
    <Suspense fallback={<ServiceDeliveryLoading />}>
      <HydrationBoundary state={state}>
        <ServiceDeliveryPage />
      </HydrationBoundary>
    </Suspense>
  );
}
