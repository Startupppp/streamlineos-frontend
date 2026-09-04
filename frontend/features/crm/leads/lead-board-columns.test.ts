import { projectBoardColumns, boardColumnKeys, type ServerBoard } from "./lead-board-columns";
import type { BoardLead } from "./leads-types";

function lead(id: number, over: Partial<BoardLead> = {}): BoardLead {
  return { id, name: `Lead ${id}`, email: null, phone: null, company: null, ...over };
}

/**
 * The shape the seeded reference tenant actually returns: five stages, and NOT
 * the pipeline's INTERESTED or LOST. `select distinct lifecycle_stage` on
 * scratch_gates_head gives NEW / CONTACTED / QUALIFIED / CONVERTED / UNQUALIFIED
 * for every one of the four seeded orgs.
 */
const TENANT_BOARD: ServerBoard = {
  NEW: { leads: [lead(1, { company: "Acme" })], total: 1 },
  CONTACTED: { leads: [lead(2, { email: "b@x.io" })], total: 1 },
  QUALIFIED: { leads: [lead(3)], total: 1 },
  CONVERTED: { leads: [lead(4)], total: 1 },
  UNQUALIFIED: { leads: [lead(5, { phone: "555-0100" })], total: 1 },
};

describe("projectBoardColumns — the board is keyed by the tenant's stages, not by a fixed six", () => {
  it("does not throw on a tenant whose pipeline omits stages the client draws", () => {
    expect(() => projectBoardColumns(TENANT_BOARD, "")).not.toThrow();
  });

  it("returns an empty column for a stage the server did not send", () => {
    const board = projectBoardColumns(TENANT_BOARD, "");
    expect(board).not.toBeNull();
    expect(board?.INTERESTED).toEqual([]);
    expect(board?.LOST).toEqual([]);
  });

  it("keeps a tenant-defined stage the pipeline order does not name", () => {
    const board = projectBoardColumns(TENANT_BOARD, "");
    expect(board?.UNQUALIFIED?.map((l) => l.id)).toEqual([5]);
    expect(boardColumnKeys(TENANT_BOARD)).toContain("UNQUALIFIED");
  });

  it("survives an org with no leads at all, where the server sends {}", () => {
    const board = projectBoardColumns({}, "");
    expect(board?.NEW).toEqual([]);
    expect(Object.keys(board ?? {})).toHaveLength(6);
  });

  it("survives a column whose leads array is missing", () => {
    const board = projectBoardColumns({ NEW: { total: 3 } as never }, "");
    expect(board?.NEW).toEqual([]);
  });

  it("still filters by name, email, phone and company", () => {
    expect(projectBoardColumns(TENANT_BOARD, "acme")?.NEW?.map((l) => l.id)).toEqual([1]);
    expect(projectBoardColumns(TENANT_BOARD, "b@x.io")?.CONTACTED?.map((l) => l.id)).toEqual([2]);
    expect(projectBoardColumns(TENANT_BOARD, "555-0100")?.UNQUALIFIED?.map((l) => l.id)).toEqual([5]);
    expect(projectBoardColumns(TENANT_BOARD, "acme")?.CONTACTED).toEqual([]);
  });

  it("passes null through so a pending query is not a board", () => {
    expect(projectBoardColumns(null, "")).toBeNull();
    expect(projectBoardColumns(undefined, "")).toBeNull();
  });
});
