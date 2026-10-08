import { z } from "zod";
import type { CreateManagedProductInput } from "@/types/projects";

export const createManagedProductSchema = z.object({
  name: z.string().min(1, "Required").max(255),
  key: z
    .string()
    .min(1, "Required")
    .max(50)
    .regex(/^[A-Z0-9_-]+$/, "Uppercase letters, digits, hyphens, or underscores only"),
  description: z.string(),
  ownerId: z.string(),
});

export type CreateManagedProductFormValues = z.infer<typeof createManagedProductSchema>;

export function toCreateManagedProductInput(
  values: CreateManagedProductFormValues,
): CreateManagedProductInput {
  return {
    name: values.name,
    key: values.key,
    ...(values.description ? { description: values.description } : {}),
    ...(values.ownerId ? { ownerId: values.ownerId } : {}),
  };
}

export const editManagedProductSchema = z.object({
  name: z.string().min(1, "Required").max(255),
  description: z.string(),
  ownerId: z.string(),
  status: z.enum(["active", "archived"]),
});

export type EditManagedProductFormValues = z.infer<typeof editManagedProductSchema>;
