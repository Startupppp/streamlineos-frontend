import { z } from "zod";

const WAREHOUSE_NAME_RE = /^[\p{L}\p{N}\s\-&.,()'/]+$/u;
const WAREHOUSE_CODE_RE = /^[A-Z0-9][A-Z0-9\-_]*$/;
const ADDRESS_SAFE_RE = /^[\p{L}\p{N}\s\-.,#/()']+$/u;
const GEO_SAFE_RE = /^[\p{L}\p{N}\s\-.,'()]+$/u;

export const createWarehouseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Warehouse name is required")
    .max(100, "Name must be 100 characters or fewer")
    .regex(WAREHOUSE_NAME_RE, "Name contains unsupported characters"),
  code: z
    .string()
    .trim()
    .min(2, "Code must be at least 2 characters")
    .max(20, "Code must be 20 characters or fewer")
    .regex(
      WAREHOUSE_CODE_RE,
      "Code must be uppercase letters/numbers, e.g. WH-001",
    ),
  address: z
    .string()
    .trim()
    .max(255, "Address must be 255 characters or fewer")
    .regex(ADDRESS_SAFE_RE, "Address contains unsupported characters")
    .optional()
    .or(z.literal("")),
  city: z
    .string()
    .trim()
    .max(100, "City must be 100 characters or fewer")
    .regex(GEO_SAFE_RE, "City contains unsupported characters")
    .optional()
    .or(z.literal("")),
  state: z
    .string()
    .trim()
    .max(100, "State must be 100 characters or fewer")
    .regex(GEO_SAFE_RE, "State contains unsupported characters")
    .optional()
    .or(z.literal("")),
  country: z
    .string()
    .trim()
    .max(100, "Country must be 100 characters or fewer")
    .regex(GEO_SAFE_RE, "Country contains unsupported characters")
    .optional()
    .or(z.literal("")),
  isActive: z.boolean(),
});

export type CreateWarehouseValues = z.infer<typeof createWarehouseSchema>;
