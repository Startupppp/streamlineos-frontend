import { Suspense } from "react";
import { ServiceDeliveryPage } from "@/features/hr/service-delivery/service-delivery-page";
import ServiceDeliveryLoading from "./loading";

export default function Page() {
  return (
    <Suspense fallback={<ServiceDeliveryLoading />}>
      <ServiceDeliveryPage />
    </Suspense>
  );
}
