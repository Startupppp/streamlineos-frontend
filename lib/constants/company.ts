import { fromISODateString } from "@/lib/date-utils";

/** Vaivamm Capital establishment date (27 October). */
export const VAIVAMM_ESTABLISHED_DATE_ISO = "2024-10-27";

export function getVaivammEstablishedDate(): Date {
  return fromISODateString(VAIVAMM_ESTABLISHED_DATE_ISO);
}
