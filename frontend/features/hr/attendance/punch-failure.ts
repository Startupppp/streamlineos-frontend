export type PunchFailureKind = "geofence" | "other";

const LOCATION_SIGNALS =
  /geofen|outside|out of range|not at|location|premis|coordinat|radius/i;

export function classifyPunchFailure(message: string | null | undefined): PunchFailureKind {
  if (!message) return "other";
  return LOCATION_SIGNALS.test(message) ? "geofence" : "other";
}

export function punchFailureTitle(kind: PunchFailureKind): string {
  return kind === "geofence" ? "You are outside the work location" : "Check-in failed";
}
