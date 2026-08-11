import { z } from "zod";

export const AVAILABLE_EVENTS = [
  { id: "lead.created", label: "Lead Created" },
  { id: "lead.status_changed", label: "Lead Status Changed" },
  { id: "lead.assigned", label: "Lead Assigned" },
  { id: "lead.converted", label: "Lead Converted" },
  { id: "deal.created", label: "Deal Created" },
  { id: "deal.stage_changed", label: "Deal Stage Changed" },
  { id: "deal.won", label: "Deal Won" },
  { id: "deal.lost", label: "Deal Lost" },
  { id: "resignation.submitted", label: "Resignation Submitted" },
  { id: "resignation.approved", label: "Resignation Approved" },
  { id: "termination.submitted", label: "Termination Submitted" },
  { id: "termination.approved", label: "Termination Approved" },
  { id: "invoice.created", label: "Invoice Created" },
  { id: "invoice.paid", label: "Invoice Paid" },
  { id: "employee.onboarded", label: "Employee Onboarded" },
  { id: "inventory.stock.low", label: "Inventory Stock Low" },
  { id: "inventory.purchase_order.received", label: "Purchase Order Received" },
  { id: "inventory.sales_order.confirmed", label: "Sales Order Confirmed" },
  { id: "inventory.sales_order.shipped", label: "Sales Order Shipped" },
  { id: "inventory.product.updated", label: "Product Updated" },
] as const;

export const webhookCreateSchema = z.object({
  url: z
    .string()
    .min(1, "URL is required")
    .url("Enter a valid URL")
    .refine(
      (u) => {
        try {
          const parsed = new URL(u);
          return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Must be an http(s) URL pointing to a public host" },
    ),
  description: z.string().max(500).optional(),
  events: z.array(z.string()),
});

export type WebhookCreateFormValues = z.infer<typeof webhookCreateSchema>;
