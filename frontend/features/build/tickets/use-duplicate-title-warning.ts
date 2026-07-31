import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useTicketSearch } from "@/hooks/api/build/ticket-search";

export function useDuplicateTitleWarning(title: string, projectId: number | null) {
  const debouncedTitle = useDebouncedValue(title, 500);

  const trimmed = debouncedTitle.trim().toLowerCase();
  const enabled = trimmed.length >= 3 && projectId != null;

  const { data } = useTicketSearch(trimmed, { enabled });

  const matches = (data ?? []).filter(
    (r) =>
      projectId != null &&
      r.projectId === projectId &&
      r.title.trim().toLowerCase() === trimmed &&
      r.status !== "DONE" &&
      r.status !== "CANCELLED",
  );

  return matches;
}
