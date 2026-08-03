import { z } from "zod";

export function createDeleteProjectConfirmSchema(expectedName: string) {
  return z.object({
    confirmName: z
      .string()
      .min(1, "Enter the project name to confirm")
      .refine((value) => value === expectedName, {
        message: "Name does not match",
      }),
  });
}

export type DeleteProjectConfirmValues = z.infer<
  ReturnType<typeof createDeleteProjectConfirmSchema>
>;
