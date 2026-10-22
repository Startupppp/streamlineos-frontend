import { queryKeyBase as base } from "./base";

export const inventoryReturnsQueryKeys = {
  returns: {
    customerList: [...base, "inventory", "customerReturns"] as const,
    vendorList: [...base, "inventory", "vendorReturns"] as const,
  },
} as const;
