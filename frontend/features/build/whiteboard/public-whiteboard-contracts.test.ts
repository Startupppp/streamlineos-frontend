/**
 * @jest-environment node
 *
 * C5 — contract tests for the public whiteboard share-link surface.
 *
 * The GET /public/whiteboard-links/:token endpoint returns a board snapshot
 * plus the capability the link carries ("view" | "edit"). The PATCH returns
 * a settled write confirmation with the server's updatedAt timestamp.
 *
 * Both contracts are declared in workspace-schema.ts and consumed in
 * whiteboards-public.ts via lazyContract. These tests verify:
 *   1. The wire shape parses cleanly through the declared contract.
 *   2. Renamed or dropped fields throw CONTRACT_VIOLATION, not undefined.
 *   3. The access enum is restricted to "view" | "edit".
 *   4. The cache key is scoped to the share token and is distinct from
 *      authenticated whiteboard keys — public and private caches must not
 *      share a key space.
 */
import { parseApiResponse, isContractViolation } from "@/lib/api-envelope";
import { publicWhiteboardContract, publicWhiteboardUpdateContract } from "@/hooks/api/build/workspace-schema";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";

const SHARE_TOKEN = "sh_T9bNxK3mLpW7vQ2rA6uC1d";

const WIRE_BOARD = {
  name: "Architecture overview",
  data: {
    type: "excalidraw",
    version: 2,
    source: "https://excalidraw.com",
    elements: [
      { id: "el_1", type: "rectangle", x: 10, y: 10, width: 100, height: 50 },
    ],
    appState: { viewBackgroundColor: "#ffffff" },
  },
  access: "view",
  allowExport: false,
  updatedAt: "2026-06-01T12:00:00.000Z",
};

const WIRE_UPDATE_RESULT = {
  success: true,
  updatedAt: "2026-06-01T12:05:00.000Z",
};

function mockResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    json: async () => body,
  };
}

async function violates(promise: Promise<unknown>): Promise<boolean> {
  try {
    await promise;
    return false;
  } catch (err) {
    return isContractViolation(err);
  }
}

describe("publicWhiteboardContract — wire shape", () => {
  it("the raw envelope shape is not the board shape", () => {
    const envelope = { success: true, data: WIRE_BOARD };
    expect(publicWhiteboardContract.safeParse(envelope).success).toBe(false);
  });

  it("parseApiResponse unwraps and returns the board", async () => {
    const board = await parseApiResponse(
      mockResponse({ success: true, data: WIRE_BOARD }),
      publicWhiteboardContract,
      `/public/whiteboard-links/${SHARE_TOKEN}`,
    );
    expect(board.name).toBe("Architecture overview");
    expect(board.access).toBe("view");
    expect(board.allowExport).toBe(false);
    expect(board.data.elements).toHaveLength(1);
  });

  it("accepts edit capability", async () => {
    const board = await parseApiResponse(
      mockResponse({ success: true, data: { ...WIRE_BOARD, access: "edit" } }),
      publicWhiteboardContract,
      `/public/whiteboard-links/${SHARE_TOKEN}`,
    );
    expect(board.access).toBe("edit");
  });

  it("accepts a null updatedAt", async () => {
    const board = await parseApiResponse(
      mockResponse({ success: true, data: { ...WIRE_BOARD, updatedAt: null } }),
      publicWhiteboardContract,
      `/public/whiteboard-links/${SHARE_TOKEN}`,
    );
    expect(board.updatedAt).toBeNull();
  });

  it("rejects an unknown access capability", async () => {
    await expect(violates(
      parseApiResponse(
        mockResponse({ success: true, data: { ...WIRE_BOARD, access: "admin" } }),
        publicWhiteboardContract,
        `/public/whiteboard-links/${SHARE_TOKEN}`,
      ),
    )).resolves.toBe(true);
  });

  it("rejects a board missing the access field", async () => {
    const { access: _dropped, ...rest } = WIRE_BOARD;
    await expect(violates(
      parseApiResponse(
        mockResponse({ success: true, data: rest }),
        publicWhiteboardContract,
        `/public/whiteboard-links/${SHARE_TOKEN}`,
      ),
    )).resolves.toBe(true);
  });

  it("rejects a board missing the data field", async () => {
    const { data: _dropped, ...rest } = WIRE_BOARD;
    await expect(violates(
      parseApiResponse(
        mockResponse({ success: true, data: rest }),
        publicWhiteboardContract,
        `/public/whiteboard-links/${SHARE_TOKEN}`,
      ),
    )).resolves.toBe(true);
  });
});

describe("publicWhiteboardUpdateContract — write confirmation", () => {
  it("parses a successful update result", async () => {
    const result = await parseApiResponse(
      mockResponse({ success: true, data: WIRE_UPDATE_RESULT }),
      publicWhiteboardUpdateContract,
      `/public/whiteboard-links/${SHARE_TOKEN}`,
    );
    expect(result.success).toBe(true);
    expect(result.updatedAt).toBe("2026-06-01T12:05:00.000Z");
  });

  it("rejects a result where success is false", async () => {
    await expect(violates(
      parseApiResponse(
        mockResponse({ success: true, data: { success: false, updatedAt: "2026-06-01T12:05:00.000Z" } }),
        publicWhiteboardUpdateContract,
        `/public/whiteboard-links/${SHARE_TOKEN}`,
      ),
    )).resolves.toBe(true);
  });

  it("rejects a result missing updatedAt", async () => {
    await expect(violates(
      parseApiResponse(
        mockResponse({ success: true, data: { success: true } }),
        publicWhiteboardUpdateContract,
        `/public/whiteboard-links/${SHARE_TOKEN}`,
      ),
    )).resolves.toBe(true);
  });
});

describe("whiteboard public cache keys — partitioning", () => {
  it("publicLink key encodes the share token", () => {
    const key = accountingAndSupportQueryKeys.whiteboards.publicLink(SHARE_TOKEN);
    expect(key.join(",")).toContain(SHARE_TOKEN);
  });

  it("different share tokens produce different cache keys", () => {
    const a = accountingAndSupportQueryKeys.whiteboards.publicLink("sh_aaa");
    const b = accountingAndSupportQueryKeys.whiteboards.publicLink("sh_bbb");
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("public link key is distinct from the authenticated detail key", () => {
    const pub = accountingAndSupportQueryKeys.whiteboards.publicLink(SHARE_TOKEN);
    const auth = accountingAndSupportQueryKeys.whiteboards.detail(1);
    expect(JSON.stringify(pub)).not.toBe(JSON.stringify(auth));
  });
});
