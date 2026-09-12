import { z } from "zod";

export const inviteEmailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .max(254, "Email must be at most 254 characters")
  .transform((value) => value.toLowerCase());
