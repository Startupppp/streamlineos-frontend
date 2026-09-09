import { z } from "zod";

/**
 * The shape both location sheets share, mirroring the backend's
 * `createLocationSchema` — of which `updateLocationSchema` is the `.partial()`.
 *
 * `capacity` is a string all the way to the wire because the column is
 * `numeric(18,4)` and the endpoint validates it as a decimal string. It used to
 * be `Number()`-ed before sending, which the `.strict()` schema rejected, so a
 * location created with a capacity 400d and one created without worked.
 */
export const locationFormSchema = z.object({
  name: z.string().trim().min(1, "Location name is required").max(100),
  code: z.string().trim().min(1, "Location code is required").max(20),
  locationType: z.string().min(1, "Location type is required"),
  parentLocationId: z.string().optional(),
  isPickable: z.boolean(),
  isReceivable: z.boolean(),
  isSellable: z.boolean(),
  capacity: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d+(\.\d+)?$/.test(value), "Enter a positive number")
    .optional(),
});

export type LocationFormValues = z.infer<typeof locationFormSchema>;

/** The edit sheet adds the one field a live location has and a new one cannot. */
export const locationEditSchema = locationFormSchema.extend({
  isActive: z.boolean(),
});

export type LocationEditValues = z.infer<typeof locationEditSchema>;

export const LOCATION_FORM_DEFAULTS: LocationFormValues = {
  name: "",
  code: "",
  locationType: "ZONE",
  parentLocationId: "",
  isPickable: false,
  isReceivable: false,
  isSellable: false,
  capacity: "",
};

export function getLocationTypeDefaults(
  type: string,
): Pick<LocationFormValues, "isPickable" | "isReceivable" | "isSellable"> {
  switch (type) {
    case "RECEIVING":
    case "RETURNS":
      return { isPickable: false, isReceivable: true, isSellable: false };
    case "SHIPPING":
      return { isPickable: true, isReceivable: false, isSellable: false };
    case "BIN":
    case "RACK":
      return { isPickable: true, isReceivable: true, isSellable: true };
    case "QUARANTINE":
    case "SCRAP":
      return { isPickable: false, isReceivable: false, isSellable: false };
    default:
      return { isPickable: false, isReceivable: false, isSellable: false };
  }
}
