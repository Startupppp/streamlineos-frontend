import { z } from "zod";

export const PRODUCT_TYPE_OPTIONS = [
  { value: "software_product", label: "Software product" },
  { value: "content_brief", label: "Content brief" },
  { value: "freelancer_project", label: "Freelancer project" },
] as const;

export type ProductType = (typeof PRODUCT_TYPE_OPTIONS)[number]["value"];

export const createManagedProductSchema = z.object({
  name: z.string().min(1, "Required").max(255),
  key: z
    .string()
    .min(1, "Required")
    .max(50)
    .regex(/^[A-Z0-9_-]+$/, "Uppercase letters, digits, hyphens, or underscores only"),
  productType: z.enum(["software_product", "content_brief", "freelancer_project"]).optional(),
  description: z.string(),
  ownerId: z.string(),
});

export type CreateManagedProductFormValues = z.infer<typeof createManagedProductSchema>;

export const editManagedProductSchema = z.object({
  name: z.string().min(1, "Required").max(255),
  description: z.string(),
  ownerId: z.string(),
  status: z.enum(["active", "archived"]),
});

export type EditManagedProductFormValues = z.infer<typeof editManagedProductSchema>;
