import { useMemo } from "react";
import {
  useIntegrationConnections,
  type IntegrationConnection,
  type IntegrationToolkit,
} from "@/hooks/api/integrations";

const CALENDAR_TOOLKITS: IntegrationToolkit[] = ["googlecalendar", "outlook"];

export function isCalendarToolkit(toolkit: IntegrationToolkit): boolean {
  return CALENDAR_TOOLKITS.includes(toolkit);
}

export function useCalendarConnections() {
  const query = useIntegrationConnections();
  const data = useMemo<IntegrationConnection[] | undefined>(
    () => query.data?.filter((c) => isCalendarToolkit(c.toolkit)),
    [query.data],
  );
  return { ...query, data };
}
