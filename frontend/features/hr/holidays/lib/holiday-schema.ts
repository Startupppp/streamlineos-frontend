import { z } from "zod";
import { Calendar, CalendarDays, Clock, Globe, List } from "lucide-react";

export const holidaySchema = z.object({
  name: z
    .string()
    .transform((v) => v.trim().replace(/\s+/g, " "))
    .pipe(
      z
        .string()
        .min(2, "Holiday name must be at least 2 characters")
        .max(100, "Holiday name must be at most 100 characters")
        .refine((v) => /[a-zA-Z]/.test(v), "Holiday name must contain at least one letter")
        .refine(
          (v) => /^[\p{L}\p{N}\s'.-]+$/u.test(v),
          "Holiday name can only use letters, numbers, spaces, apostrophes, periods, and hyphens",
        ),
    ),
  date: z.string().min(1, "Date is required"),
  recurring: z.boolean(),
});

export type HolidayFormValues = z.infer<typeof holidaySchema>;

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type ViewMode = "calendar" | "list" | "year" | "upcoming" | "location";

export const VIEW_OPTIONS: { value: ViewMode; label: string; icon: React.ElementType }[] = [
  { value: "calendar", label: "Calendar", icon: Calendar },
  { value: "list", label: "List", icon: List },
  { value: "year", label: "Year", icon: CalendarDays },
  { value: "upcoming", label: "Upcoming", icon: Clock },
  { value: "location", label: "By Location", icon: Globe },
];
