import {
  whiteboardListContract,
  whiteboardDetailContract,
  publicWhiteboardContract,
  publicWhiteboardUpdateContract,
  whiteboardSharingUpdateContract,
  whiteboardSharesContract,
} from "@/hooks/api/build/workspace-schema";

const listItem = {
  id: 1,
  name: "Architecture overview",
  elementCount: 42,
  visibility: "project" as const,
  createdBy: "user-abc",
  updatedAt: "2026-09-25T10:00:00Z",
};

const excalidrawScene = {
  type: "excalidraw",
  version: 2,
  source: "https://excalidraw.com",
  elements: [{ id: "el1", type: "rectangle" }],
  appState: { viewBackgroundColor: "#ffffff" },
  files: {},
};

const detailWithSharing = {
  id: 1,
  projectId: 10,
  name: "Architecture overview",
  data: excalidrawScene,
  visibility: "project" as const,
  access: "manage" as const,
  sharing: {
    visibility: "project" as const,
    publicAccess: "viewer" as const,
    shareToken: "tok-abc123",
    linkExpiresAt: null,
    allowExport: true,
  },
  shares: [
    { userId: "user-2", role: "viewer" as const, name: "Alice", email: "alice@example.com" },
  ],
  createdBy: "user-abc",
  createdAt: "2026-09-01T08:00:00Z",
  updatedAt: "2026-09-25T10:00:00Z",
};

const detailViewerAccess = {
  ...detailWithSharing,
  access: "view" as const,
  sharing: null,
  shares: null,
};

describe("whiteboardListContract", () => {
  it("accepts a valid non-empty list", () => {
    expect(whiteboardListContract.safeParse([listItem]).success).toBe(true);
  });

  it("accepts an empty list", () => {
    expect(whiteboardListContract.safeParse([]).success).toBe(true);
  });

  it("rejects an item missing elementCount", () => {
    const { elementCount: _dropped, ...bad } = listItem;
    expect(whiteboardListContract.safeParse([bad]).success).toBe(false);
  });

  it("rejects an item with an unknown visibility value", () => {
    const bad = { ...listItem, visibility: "team" };
    expect(whiteboardListContract.safeParse([bad]).success).toBe(false);
  });
});

describe("whiteboardDetailContract", () => {
  it("accepts a detail record with sharing (manage access)", () => {
    expect(whiteboardDetailContract.safeParse(detailWithSharing).success).toBe(true);
  });

  it("accepts a detail record with null sharing (viewer access)", () => {
    expect(whiteboardDetailContract.safeParse(detailViewerAccess).success).toBe(true);
  });

  it("rejects a record missing the data field", () => {
    const { data: _dropped, ...bad } = detailWithSharing;
    expect(whiteboardDetailContract.safeParse(bad).success).toBe(false);
  });

  it("rejects a record with an unknown access level", () => {
    const bad = { ...detailWithSharing, access: "owner" };
    expect(whiteboardDetailContract.safeParse(bad).success).toBe(false);
  });

  it("excalidraw scene data tolerates empty elements array", () => {
    const emptyCanvas = { ...detailWithSharing, data: { ...excalidrawScene, elements: [] } };
    expect(whiteboardDetailContract.safeParse(emptyCanvas).success).toBe(true);
  });
});

describe("publicWhiteboardContract", () => {
  const publicBoard = {
    name: "Shared board",
    data: excalidrawScene,
    access: "view" as const,
    allowExport: false,
    updatedAt: "2026-09-25T10:00:00Z",
  };

  it("accepts a valid public board response", () => {
    expect(publicWhiteboardContract.safeParse(publicBoard).success).toBe(true);
  });

  it("accepts edit access level", () => {
    expect(publicWhiteboardContract.safeParse({ ...publicBoard, access: "edit" }).success).toBe(true);
  });

  it("rejects manage access on public board — manage is not a public access level", () => {
    expect(publicWhiteboardContract.safeParse({ ...publicBoard, access: "manage" }).success).toBe(false);
  });

  it("accepts null updatedAt", () => {
    expect(publicWhiteboardContract.safeParse({ ...publicBoard, updatedAt: null }).success).toBe(true);
  });
});

describe("publicWhiteboardUpdateContract", () => {
  it("accepts the success response shape", () => {
    const res = { success: true as const, updatedAt: "2026-09-25T11:00:00Z" };
    expect(publicWhiteboardUpdateContract.safeParse(res).success).toBe(true);
  });

  it("rejects a response where success is false", () => {
    const bad = { success: false, updatedAt: "2026-09-25T11:00:00Z" };
    expect(publicWhiteboardUpdateContract.safeParse(bad).success).toBe(false);
  });
});

describe("whiteboardSharingUpdateContract", () => {
  const sharing = {
    visibility: "public" as const,
    publicAccess: "viewer" as const,
    shareToken: "tok-xyz",
    linkExpiresAt: "2026-12-31T23:59:00Z",
    allowExport: true,
  };

  it("accepts a valid sharing update response", () => {
    expect(whiteboardSharingUpdateContract.safeParse(sharing).success).toBe(true);
  });

  it("accepts null shareToken and linkExpiresAt", () => {
    const noToken = { ...sharing, shareToken: null, linkExpiresAt: null };
    expect(whiteboardSharingUpdateContract.safeParse(noToken).success).toBe(true);
  });
});

describe("whiteboardSharesContract", () => {
  it("accepts a list of share entries", () => {
    const shares = [
      { userId: "user-1", role: "viewer" as const, name: "Alice", email: "alice@example.com" },
      { userId: "user-2", role: "editor" as const, name: null, email: "bob@example.com" },
    ];
    expect(whiteboardSharesContract.safeParse(shares).success).toBe(true);
  });

  it("rejects a share with unknown role", () => {
    const bad = [{ userId: "user-1", role: "admin", name: null, email: "x@example.com" }];
    expect(whiteboardSharesContract.safeParse(bad).success).toBe(false);
  });
});
