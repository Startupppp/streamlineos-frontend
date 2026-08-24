/**
 * The shape a status renders from, and the lookup that never returns nothing.
 * Deliberately free of any module's status vocabulary: callers pass their own
 * config, which is what lets one set of filter controls serve any list.
 */
export interface StatusConfigEntry {
  label: string;
  dotColor: string;
  color?: string | null;
}

export function getStatusEntry(
  config: Record<string, StatusConfigEntry>,
  key: string,
): StatusConfigEntry {
  return (
    config[key] ?? { label: key.replace(/_/g, " "), dotColor: "bg-muted-foreground" }
  );
}
