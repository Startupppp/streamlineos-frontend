export const serviceDeliveryKeys = {
  opsInbox: ["hr", "service-delivery", "ops-inbox"] as const,
  myItems: ["hr", "service-delivery", "my-items"] as const,
};

export function serviceDeliveryOpsInboxQueryOptions() {
  return {
    queryKey: serviceDeliveryKeys.opsInbox,
    staleTime: 30_000,
  } as const;
}

export function serviceDeliveryMyItemsQueryOptions() {
  return {
    queryKey: serviceDeliveryKeys.myItems,
    staleTime: 30_000,
  } as const;
}
