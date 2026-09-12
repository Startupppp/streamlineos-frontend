"use client";

import { useCallback } from "react";
import type { BigCalEvent } from "./big-calendar-wrapper";
import {
  EVENT_CATEGORY_COLORS,
  EVENT_COLORS,
  EVENT_INK,
} from "./calendar-event-constants";

const RSVP_BORDER_COLORS: Record<string, string> = {
  accepted: EVENT_COLORS.green,
  declined: EVENT_COLORS.red,
  tentative: EVENT_COLORS.yellow,
};

export function useEventPropGetter() {
  return useCallback((event: BigCalEvent) => {
    if (event.resource?.source === "attendance") {
      return {
        style: {
          backgroundColor:
            EVENT_COLORS[event.resource.color ?? "green"] ?? EVENT_COLORS.green,
          border: "none",
          borderRadius: "4px",
          color: EVENT_INK,
          fontSize: "11px",
          padding: "1px 6px",
        },
      };
    }
    if (event.resource?.source === "hr") {
      return {
        style: {
          backgroundColor: event.resource.color ?? EVENT_COLORS.blue,
          border: "none",
          borderRadius: "4px",
          color: EVENT_INK,
          fontSize: "11px",
          padding: "1px 6px",
        },
      };
    }
    if (event.resource?.source === "external") {
      return {
        style: {
          backgroundColor: event.resource.color ?? EVENT_COLORS.blue,
          border: "none",
          borderRadius: "4px",
          color: EVENT_INK,
          fontSize: "12px",
          padding: "1px 6px",
        },
      };
    }
    if (event.resource?.source === "task") {
      return {
        style: {
          backgroundColor: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          color: "var(--foreground)",
          fontSize: "11px",
          padding: "1px 6px",
        },
      };
    }
    const rsvp = event.resource?.myRsvpStatus as string | null | undefined;
    const rsvpBorderColor = rsvp ? (RSVP_BORDER_COLORS[rsvp] ?? null) : null;
    const categoryColor = event.resource?.category
      ? (EVENT_CATEGORY_COLORS[event.resource.category] ?? null)
      : null;
    return {
      style: {
        backgroundColor:
          categoryColor ??
          EVENT_COLORS[event.resource?.color ?? "blue"] ??
          EVENT_COLORS.blue,
        border: "none",
        borderLeft: rsvpBorderColor ? `4px solid ${rsvpBorderColor}` : "none",
        borderRadius: "4px",
        color: EVENT_INK,
        fontSize: "12px",
        padding: rsvpBorderColor ? "1px 6px 1px 4px" : "1px 6px",
      },
    };
  }, []);
}
