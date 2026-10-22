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
