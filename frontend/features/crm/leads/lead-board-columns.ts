import { LEAD_STATUSES, type BoardLead } from "./leads-types";

/**
 * Projects the board the server sent onto the columns the client draws.
 *
 * The server does NOT return a fixed six-key object. `LeadsBoardService.getBoard`
 * keys the board by the org's own pipeline stages — `crm_pipeline_stages`, else
 * `crm_options` of type `lead_status`, else the statuses that actually occur in
 * `business_parties.lifecycle_stage`. A tenant whose vocabulary is
 * NEW/CONTACTED/QUALIFIED/CONVERTED/UNQUALIFIED gets exactly those five keys, and
 * an org with no leads at all gets `{}`.
 *
 * So the pipeline order is a *display* order, never an index into the response:
 * reading `board[status].leads` for a stage the tenant does not use throws, takes
 * the whole route to its error boundary, and the table view — which does not use
 * this board at all — goes down with it. Every key is read through
 * `readColumn`, and stages the server sent that the pipeline order does not name
 * are kept rather than dropped, so a tenant-defined stage still reaches whatever
 * renders it.
 */

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

/** The board's column keys: the pipeline order first, then any stage the server sent that it does not name. */
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
