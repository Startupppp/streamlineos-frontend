import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

/** Mirrors `componentRowSchema` in the backend's `offer-fulfillment-response.schemas.ts`. */
export const offerFulfillmentComponentContract = z.object({
  offerFulfillmentComponentId: z.number(),
  orgId: z.string(),
  crmOfferId: z.number().int(),
  crmOfferOrgId: z.string(),
  invSkuId: z.number().int(),
  invSkuOrgId: z.string(),
  quantityPerUnit: z.string(),
  uom: z.string().nullable(),
  status: z.string(),
  effectiveFrom: z.string().nullable(),
  effectiveTo: z.string().nullable(),
  notes: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const offerFulfillmentPageContract = cursorPageContract(offerFulfillmentComponentContract);
export const offerFulfillmentDeleteContract = z.object({ success: z.literal(true) });

export type OfferFulfillmentComponent = z.infer<typeof offerFulfillmentComponentContract>;
export type OfferFulfillmentPage = z.infer<typeof offerFulfillmentPageContract>;
