import { z } from "zod";

const DECIMAL_QUANTITY = /^\d+(\.\d{1,4})?$/;

const decimalField = z
  .string()
  .refine((value) => value === "" || DECIMAL_QUANTITY.test(value), {
    message: "Enter a number with up to 4 decimal places",
  });

export const channelSchema = z.object({
  name: z.string().min(1, "Name is required"),
  channelType: z.enum(["INTERNAL", "SHOPIFY", "WOOCOMMERCE", "MARKETPLACE", "B2B", "THREE_PL"]),
  status: z.enum(["ACTIVE", "PAUSED"]),
  safetyBuffer: decimalField,
  publishThreshold: decimalField,
  warehouseIds: z.array(z.number()),
});

export type ChannelFormValues = z.infer<typeof channelSchema>;

export function optionalDecimal(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}
