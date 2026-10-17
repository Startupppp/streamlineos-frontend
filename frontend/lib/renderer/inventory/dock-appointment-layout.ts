import type { RecordLayout } from "../layout";

/**
 * A dock appointment — which vehicle holds which door, and when — as data.
 *
 * `window` and `carrier` are what the day's list shows rather than what the
 * API stores: the surface derives the window from the two instants and the
 * carrier from `carrierName`, falling back to the vehicle reference. They are
 * declared read-only so the columns exist and can be arranged.
 *
 * The booking form writes `doorId`, `windowStart`, `windowEnd` and
 * `carrierName`. The door is a pointer whose choices are the warehouse's open
 * doors, and the two window fields are times of the day being viewed; the
 * engine has no time-of-day kind, so the surface supplies both controls.
 */
export const DOCK_APPOINTMENT_LAYOUT: RecordLayout = {
  key: "inventory:dock-appointment",
  singular: "Dock appointment",
  plural: "Dock appointments",
  titleField: "doorCode",
  fields: [
    { name: "doorCode", label: "Door", kind: "text", readOnly: true },
    { name: "window", label: "Window", kind: "text", readOnly: true },
    {
      name: "direction",
      label: "Direction",
      kind: "badge",
      readOnly: true,
      options: [
        { value: "INBOUND", label: "INBOUND", tone: "neutral" },
        { value: "OUTBOUND", label: "OUTBOUND", tone: "neutral" },
      ],
    },
    { name: "carrier", label: "Carrier", kind: "text", readOnly: true },
    {
      name: "status",
      label: "Status",
      kind: "badge",
      readOnly: true,
      options: [
        { value: "BOOKED", label: "BOOKED", tone: "info" },
        { value: "ARRIVED", label: "ARRIVED", tone: "warning" },
        { value: "COMPLETED", label: "COMPLETED", tone: "success" },
        { value: "CANCELLED", label: "CANCELLED", tone: "neutral" },
        { value: "NO_SHOW", label: "NO_SHOW", tone: "danger" },
      ],
    },
    {
      name: "doorId",
      label: "Door",
      kind: "reference",
      referenceTo: "inventory:dock-door",
      required: true,
    },
    { name: "windowStart", label: "From", kind: "text", required: true },
    { name: "windowEnd", label: "To", kind: "text", required: true },
    { name: "carrierName", label: "Carrier", kind: "text" },
  ],
  list: {
    searchPlaceholder: "Search appointments…",
    columns: [
      { field: "doorCode", primary: true },
      { field: "window" },
      { field: "direction" },
      { field: "carrier" },
      { field: "status" },
    ],
  },
  detail: {
    sections: [
      { title: "Appointment", fields: ["doorCode", "window", "direction", "carrier", "status"] },
    ],
  },
  form: {
    sections: [
      { title: "Book a slot", fields: ["doorId", "windowStart", "windowEnd", "carrierName"] },
    ],
  },
};
