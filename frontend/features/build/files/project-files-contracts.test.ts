/**
 * @jest-environment node
 *
 * C5 — contract tests for the project files surface.
 *
 * `GET /build/projects/:projectId/files` returns a cursor page whose shape is
 * declared in `project-files-schema.ts`. These tests verify:
 *   1. The wire shape parses through filePageContract.
 *   2. Renamed or dropped fields throw CONTRACT_VIOLATION, not undefined.
 *   3. The cursor envelope is present — `data` + `pagination` with `nextCursor`
 *      and `hasMore`. An array-only payload is rejected.
 *   4. `deletedAt` is present in the projection (if omitted, soft-deleted files
 *      render as live items and the page breaks after the first page boundary).
 *   5. The cache key includes projectId so two projects never share a list.
 *   6. The signed-URL contract enforces `url` and `expiresIn`.
 */
import { parseApiResponse, isContractViolation } from "@/lib/api-envelope";
import {
  filePageContract,
  fileRowContract,
  signedUrlContract,
} from "@/hooks/api/build/project-files-schema";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

const FILE_ROW = {
  id: 1,
  orgId: "org_abc",
  projectId: 42,
  uploadedByMembershipId: 7,
  fileName: "requirements.pdf",
  mimeType: "application/pdf",
  sizeBytes: 204800,
  createdAt: "2026-03-01T09:00:00.000Z",
  deletedAt: null,
};

const WIRE_PAGE = {
  data: [FILE_ROW],
  pagination: {
    limit: 50,
    hasMore: false,
    nextCursor: null,
  },
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

describe("filePageContract — cursor envelope is required", () => {
  it("accepts a valid cursor page", async () => {
    const page = await parseApiResponse(
      mockResponse({ success: true, data: WIRE_PAGE }),
      filePageContract,
      "/build/projects/42/files",
    );
    expect(page.data).toHaveLength(1);
    expect(page.pagination.hasMore).toBe(false);
    expect(page.pagination.nextCursor).toBeNull();
  });

  it("rejects a bare array — cursor envelope is required", async () => {
    await expect(violates(
      parseApiResponse(
        mockResponse({ success: true, data: [FILE_ROW] }),
        filePageContract,
        "/build/projects/42/files",
      ),
    )).resolves.toBe(true);
  });

  it("rejects a page missing the pagination object", async () => {
    const { pagination: _dropped, ...rest } = WIRE_PAGE;
    await expect(violates(
      parseApiResponse(
        mockResponse({ success: true, data: rest }),
        filePageContract,
        "/build/projects/42/files",
      ),
    )).resolves.toBe(true);
  });

  it("accepts hasMore: true with a non-null nextCursor", async () => {
    const wire = { ...WIRE_PAGE, pagination: { limit: 50, hasMore: true, nextCursor: "cursor_next" } };
    const page = await parseApiResponse(
      mockResponse({ success: true, data: wire }),
      filePageContract,
      "/build/projects/42/files",
    );
    expect(page.pagination.hasMore).toBe(true);
    expect(page.pagination.nextCursor).toBe("cursor_next");
  });
});

describe("fileRowContract — projection completeness", () => {
  it("parses a valid file row", () => {
    const result = fileRowContract.safeParse(FILE_ROW);
    expect(result.success).toBe(true);
  });

  it("deletedAt is present and nullable in the projection", () => {
    const liveRow = fileRowContract.safeParse({ ...FILE_ROW, deletedAt: null });
    expect(liveRow.success).toBe(true);
    expect(liveRow.data?.deletedAt).toBeNull();

    const deletedRow = fileRowContract.safeParse({
      ...FILE_ROW,
      deletedAt: "2026-04-01T00:00:00.000Z",
    });
    expect(deletedRow.success).toBe(true);
    expect(deletedRow.data?.deletedAt).toBe("2026-04-01T00:00:00.000Z");
  });

  it("rejects a row missing the required fileName", () => {
    const { fileName: _dropped, ...rest } = FILE_ROW;
    expect(fileRowContract.safeParse(rest).success).toBe(false);
  });

  it("rejects a row missing sizeBytes", () => {
    const { sizeBytes: _dropped, ...rest } = FILE_ROW;
    expect(fileRowContract.safeParse(rest).success).toBe(false);
  });
});

describe("signedUrlContract", () => {
  it("parses a signed URL response", async () => {
    const result = await parseApiResponse(
      mockResponse({ success: true, data: { url: "https://cdn.example.com/file?sig=abc", expiresIn: 3600 } }),
      signedUrlContract,
      "/build/projects/42/files/1/url",
    );
    expect(result.url).toContain("https://");
    expect(result.expiresIn).toBe(3600);
  });

  it("rejects a signed URL response missing expiresIn", async () => {
    await expect(violates(
      parseApiResponse(
        mockResponse({ success: true, data: { url: "https://cdn.example.com/file" } }),
        signedUrlContract,
        "/build/projects/42/files/1/url",
      ),
    )).resolves.toBe(true);
  });
});

describe("project files cache keys — partitioning", () => {
  it("list key encodes the projectId", () => {
    const key = buildWorkQueryKeys.projects.files.list(42);
    expect(JSON.stringify(key)).toContain("42");
  });

  it("different projectIds produce different cache keys", () => {
    const a = buildWorkQueryKeys.projects.files.list(1);
    const b = buildWorkQueryKeys.projects.files.list(2);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("signedUrl key is distinct from the list key", () => {
    const list = buildWorkQueryKeys.projects.files.list(42);
    const url = buildWorkQueryKeys.projects.files.signedUrl(42, 1);
    expect(JSON.stringify(list)).not.toBe(JSON.stringify(url));
  });
});
