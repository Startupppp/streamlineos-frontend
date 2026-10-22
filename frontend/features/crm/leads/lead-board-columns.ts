import { LEAD_STATUSES, type BoardLead } from "./leads-types";


export interface ServerBoardColumn {
  leads: BoardLead[];
  total: number;
}

export type ServerBoard = Record<string, ServerBoardColumn | undefined>;

function readColumn(board: ServerBoard, status: string): BoardLead[] {
  const column = board[status];
  if (!column) return [];
  return Array.isArray(column.leads) ? column.leads : [];
}

function matchesQuery(lead: BoardLead, q: string): boolean {
  return (
    lead.name.toLowerCase().includes(q) ||
    (lead.email?.toLowerCase().includes(q) ?? false) ||
    (lead.phone?.includes(q) ?? false) ||
    (lead.company?.toLowerCase().includes(q) ?? false)
  );
}

export function boardColumnKeys(board: ServerBoard): string[] {
  const keys: string[] = [...LEAD_STATUSES];
  for (const key of Object.keys(board)) if (!keys.includes(key)) keys.push(key);
  return keys;
}

export function projectBoardColumns(
  board: ServerBoard | null | undefined,
  searchQuery: string,
): Record<string, BoardLead[]> | null {
  if (!board) return null;
  const q = searchQuery.trim().toLowerCase();
  const result: Record<string, BoardLead[]> = {};
  for (const status of boardColumnKeys(board)) {
    const leads = readColumn(board, status);
    result[status] = q ? leads.filter((lead) => matchesQuery(lead, q)) : leads;
  }
  return result;
}
