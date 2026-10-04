import { z } from "zod";
import {
  managedProductsGetManagedProductResponseSchema,
  managedProductsGetProductInsightsResponseSchema,
  type ManagedProductsGetManagedProductResponse,
  type ManagedProductsGetProductInsightsResponse,
} from "@/contracts/build-contracts.generated";

export const managedProductOwnerContract = managedProductsGetManagedProductResponseSchema.shape.owner.unwrap();

const scoreOverrideActorContract = z.object({
  id: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
});

export const managedProductInsightsContract = managedProductsGetProductInsightsResponseSchema.extend({
  ageDays: z.number().int(),
  confidenceScore: z.number().int().nullable(),
  overrideReason: z.string().nullable(),
  overriddenBy: scoreOverrideActorContract.nullable(),
  overriddenAt: z.string().nullable(),
});

export type ManagedProductOwner = NonNullable<ManagedProductsGetManagedProductResponse["owner"]>;
export type ManagedProductInsights = ManagedProductsGetProductInsightsResponse & {
  ageDays: number;
  confidenceScore: number | null;
  overrideReason: string | null;
  overriddenBy: { id: string; firstName: string | null; lastName: string | null } | null;
  overriddenAt: string | null;
};
