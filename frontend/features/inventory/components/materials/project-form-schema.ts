import { z } from "zod";

/**
 * B1 — the project form's rules, held once.
 *
 * The same shape the server validates, so the operator is told before the round
 * trip; the server remains the authority and refuses the same things
 * independently. Every message names what to do rather than what failed.
 */
export const ZONES = [
  { value: "HYD_NORTH", label: "Hyderabad North" },
  { value: "HYD_SOUTH", label: "Hyderabad South" },
  { value: "HYD_EAST", label: "Hyderabad East" },
  { value: "HYD_WEST", label: "Hyderabad West" },
] as const;

const schema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2, "Give the site a code of at least 2 characters")
      .max(30, "Keep the code to 30 characters or fewer")
      .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, "Use letters, digits, hyphens or underscores — e.g. HYD-TOWER-04")
      .transform((v) => v.toUpperCase()),
    name: z.string().trim().min(2, "Give the site a name").max(160, "Keep the name to 160 characters or fewer"),
    zone: z.enum(["HYD_NORTH", "HYD_SOUTH", "HYD_EAST", "HYD_WEST"]).optional(),
    city: z.string().trim().max(80).optional(),
    siteAddress: z.string().trim().max(255).optional(),
    siteContactName: z.string().trim().max(120).optional(),
    siteContactPhone: z
      .string()
      .trim()
      .regex(/^\+?[0-9][0-9\s-]{6,19}$/, "Enter a phone number the site can be reached on")
      .optional()
      .or(z.literal("")),
    status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD"]),
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional().or(z.literal("")),
    endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((v) => !v.startsOn || !v.endsOn || v.startsOn <= v.endsOn, {
    message: "A site cannot finish before it starts",
    path: ["endsOn"],
  });

export const projectFormSchema = schema;
export type ProjectFormValues = z.input<typeof schema>;
export type ProjectFormOutput = z.output<typeof schema>;

