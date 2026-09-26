/**
 * @jest-environment node
 *
 * C5 — contract tests for the public roadmap board, vote and feedback surfaces.
 *
 * The public roadmap API returns a flat object (not a cursor page), because the
 * whole board is one logical unit: the three roadmap columns, a feedback list and
 * a changelog. Feedback and changelog are unbounded arrays capped on the server
 * by BE-24 (100 rows). The contract must reject any field the wire shape no
 * longer carries, so a renamed or dropped column surfaces as a ContractViolation
 * rather than `undefined`.
 *
 * Cache-key assertions prove the public board key is scoped to the org handle
 * and is distinct from every authenticated roadmap key — authenticated and public
 * caches must never be shared (FE-20 allows orgId in the key only for a public
 * tenant the viewer does not belong to).
 */
import { parseApiResponse, isContractViolation } from "@/lib/api-envelope";
import {
  publicRoadmapBoardContract,
  publicVoteResultContract,
  publicFeedbackResultContract,
  roadmapPublicationContract,
} from "@/hooks/api/build/roadmap-schema";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";

const ORG_HANDLE = "rm_9fK2xQ7vBnL4tR8sW1yZ";

const WIRE_BOARD = {
  orgName: "Acme Corp",
  roadmap: {
    planned: [
      {
        id: 1,
        title: "Dark mode",
        description: "Support system dark mode preference",
        status: "planned",
        category: "UX",
        targetQuarter: "Q2 2026",
        votes: 12,
      },
    ],
    in_progress: [],
    completed: [
      {
        id: 2,
        title: "SSO",
        description: null,
        status: "completed",
        category: null,
        targetQuarter: null,
        votes: 5,
      },
    ],
  },
  feedback: [
    {
      id: 10,
      title: "API rate limits",
      description: "Please raise the API rate limits",
      category: "API",
      votes: 8,
      createdAt: "2026-01-15T10:00:00.000Z",
    },
  ],
  changelog: [
    {
      id: 100,
      title: "v1.2.0 released",
      content: "Improved performance across the board.",
      version: "1.2.0",
      type: "improvement",
      publishedAt: "2026-01-20T00:00:00.000Z",
    },
  ],
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

describe("publicRoadmapBoardContract — envelope and shape", () => {
  it("the raw envelope is a different shape from the board contract", () => {
    const envelope = { success: true, data: WIRE_BOARD };
    expect(publicRoadmapBoardContract.safeParse(envelope).success).toBe(false);
  });

  it("parseApiResponse unwraps the envelope and returns the board", async () => {
    const board = await parseApiResponse(
      mockResponse({ success: true, data: WIRE_BOARD }),
      publicRoadmapBoardContract,
      "/public/roadmap",
    );
    expect(board.orgName).toBe("Acme Corp");
    expect(board.roadmap.planned).toHaveLength(1);
    expect(board.roadmap.planned[0]?.votes).toBe(12);
    expect(board.feedback[0]?.createdAt).toBe("2026-01-15T10:00:00.000Z");
    expect(board.changelog[0]?.type).toBe("improvement");
  });

  it("accepts a null orgName — org name may be absent in edge cases", async () => {
    const board = await parseApiResponse(
      mockResponse({ success: true, data: { ...WIRE_BOARD, orgName: null } }),
      publicRoadmapBoardContract,
      "/public/roadmap",
    );
    expect(board.orgName).toBeNull();
  });

  it("rejects an unknown roadmap item status", async () => {
    const bad = {
      ...WIRE_BOARD,
      roadmap: {
        ...WIRE_BOARD.roadmap,
        planned: [{ ...WIRE_BOARD.roadmap.planned[0], status: "wishlist" }],
      },
    };
    await expect(violates(
      parseApiResponse(
        mockResponse({ success: true, data: bad }),
        publicRoadmapBoardContract,
        "/public/roadmap",
      ),
    )).resolves.toBe(true);
  });

  it("rejects a changelog entry with an unknown type", async () => {
    const bad = {
      ...WIRE_BOARD,
      changelog: [{ ...WIRE_BOARD.changelog[0], type: "breaking" }],
    };
    await expect(violates(
      parseApiResponse(
        mockResponse({ success: true, data: bad }),
        publicRoadmapBoardContract,
        "/public/roadmap",
      ),
    )).resolves.toBe(true);
  });

  it("rejects a board missing the feedback array", async () => {
    const { feedback: _dropped, ...rest } = WIRE_BOARD;
    await expect(violates(
      parseApiResponse(
        mockResponse({ success: true, data: rest }),
        publicRoadmapBoardContract,
        "/public/roadmap",
      ),
    )).resolves.toBe(true);
  });
});

describe("publicVoteResultContract", () => {
  it("parses a roadmap vote result", async () => {
    const result = await parseApiResponse(
      mockResponse({ success: true, data: { id: 1, type: "roadmap", votes: 13, voted: true } }),
      publicVoteResultContract,
      "/public/roadmap/vote",
    );
    expect(result.voted).toBe(true);
    expect(result.votes).toBe(13);
  });

  it("rejects a result missing the votes count", async () => {
    await expect(violates(
      parseApiResponse(
        mockResponse({ success: true, data: { id: 1, type: "roadmap", voted: true } }),
        publicVoteResultContract,
        "/public/roadmap/vote",
      ),
    )).resolves.toBe(true);
  });
});

describe("publicFeedbackResultContract", () => {
  it("parses a feedback submission result", async () => {
    const result = await parseApiResponse(
      mockResponse({ success: true, data: { id: 42, message: "Feedback submitted" } }),
      publicFeedbackResultContract,
      "/public/roadmap/feedback",
    );
    expect(result.id).toBe(42);
    expect(result.message).toBe("Feedback submitted");
  });
});

describe("roadmapPublicationContract", () => {
  it("parses a published token state", async () => {
    const result = await parseApiResponse(
      mockResponse({ success: true, data: { token: "rm_abc123", path: "/roadmap/rm_abc123" } }),
      roadmapPublicationContract,
      "/build/roadmap-publication",
    );
    expect(result.token).toBe("rm_abc123");
    expect(result.path).toBe("/roadmap/rm_abc123");
  });

  it("parses an unpublished state with null token and path", async () => {
    const result = await parseApiResponse(
      mockResponse({ success: true, data: { token: null, path: null } }),
      roadmapPublicationContract,
      "/build/roadmap-publication",
    );
    expect(result.token).toBeNull();
    expect(result.path).toBeNull();
  });
});

describe("roadmap public cache keys — partitioning", () => {
  it("publicBoard key encodes the org handle", () => {
    const key = knowledgeAndSurveysQueryKeys.roadmap.publicBoard(ORG_HANDLE);
    expect(key.join(",")).toContain(ORG_HANDLE);
  });

  it("different handles produce different cache keys", () => {
    const a = knowledgeAndSurveysQueryKeys.roadmap.publicBoard("rm_aaa");
    const b = knowledgeAndSurveysQueryKeys.roadmap.publicBoard("rm_bbb");
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("public board key is distinct from the authenticated items key", () => {
    const pub = knowledgeAndSurveysQueryKeys.roadmap.publicBoard(ORG_HANDLE);
    const auth = knowledgeAndSurveysQueryKeys.roadmap.items();
    expect(JSON.stringify(pub)).not.toBe(JSON.stringify(auth));
  });

  it("publication key does not collide with the public board key", () => {
    const pub = knowledgeAndSurveysQueryKeys.roadmap.publicBoard(ORG_HANDLE);
    const publ = knowledgeAndSurveysQueryKeys.roadmap.publication;
    expect(JSON.stringify(pub)).not.toBe(JSON.stringify(publ));
  });
});
