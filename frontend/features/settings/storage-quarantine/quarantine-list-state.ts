import { QUARANTINE_STATUSES, type QuarantineStatus } from "@/hooks/api/storage/quarantine-schema";

export const QUARANTINE_PAGE_SIZE = 20;

/** The `?status=` filter; an unknown value is no filter. Shared by the page and its server prefetch. */
export function readQuarantineStatus(value: string | null | undefined): QuarantineStatus | undefined {
  return QUARANTINE_STATUSES.find((status) => status === value);
}
