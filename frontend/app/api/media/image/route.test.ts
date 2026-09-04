/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));
jest.mock("@/lib/backend-url", () => ({ BACKEND_URL: "http://api.test" }));
jest.mock("@/lib/get-server-auth", () => ({ getServerAuth: jest.fn() }));

import type { Session } from "next-auth";
import { getServerAuth } from "@/lib/get-server-auth";
import { GET } from "./route";

const mockedGetServerAuth = jest.mocked(getServerAuth);
const mockFetch = jest.fn<Promise<Response>, [string, RequestInit?]>();

const ORG_A = "3f2a9c14-5b7e-4d81-9a02-6c8e1f4b7d33";
const ORG_B = "9c81d0a5-2e64-4f37-b1c8-7d5a3e2f9b40";
const KEY = `${ORG_A}/uploads/1712-avatar.png`;
const FOREIGN_KEY = `${ORG_B}/uploads/1712-avatar.png`;
const JWT = "backend.jwt.value";

const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

function session(backendJwt: string | undefined): Session {
  return {
    user: { id: "user-1", role: "MEMBER" },
    ...(backendJwt ? { backendJwt } : {}),
    expires: "2099-01-01",
  };
}

function streamOf(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

function upstreamOk(contentType: string, bytes = PNG_BYTES): Response {
  return new Response(streamOf(bytes), {
    status: 200,
    headers: { "content-type": contentType },
  });
}

function upstreamError(status: number): Response {
  return new Response(JSON.stringify({ message: "Not found" }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Exactly what a browser sends for `<img src="/api/media/image?key=…">`. */
function imgTagRequest(key: string): Request {
  return new Request(
    `https://app.test/api/media/image?key=${encodeURIComponent(key)}`,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetServerAuth.mockResolvedValue(session(JWT));
  global.fetch = mockFetch as unknown as typeof fetch;
});

describe("the request an <img> really makes", () => {
  it("carries no Authorization header of its own", () => {
    expect(imgTagRequest(KEY).headers.get("authorization")).toBeNull();
  });

  it("returns the image bytes with the object's content type", async () => {
    mockFetch.mockResolvedValue(upstreamOk("image/png"));

    const response = await GET(imgTagRequest(KEY));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(PNG_BYTES);
  });

  it("adds the session's bearer token on the hop the browser cannot make", async () => {
    mockFetch.mockResolvedValue(upstreamOk("image/webp"));

    await GET(imgTagRequest(KEY));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] ?? [];
    expect(url).toBe(
      `http://api.test/storage/image?key=${encodeURIComponent(KEY)}`,
    );
    expect(init?.headers).toEqual({ Authorization: `Bearer ${JWT}` });
  });

  it("is cacheable only by the one browser that authenticated", async () => {
    mockFetch.mockResolvedValue(upstreamOk("image/png"));

    const response = await GET(imgTagRequest(KEY));

    expect(response.headers.get("cache-control")).toBe(
      "private, max-age=60, must-revalidate",
    );
    expect(response.headers.get("cache-control")).not.toContain("public");
  });

  /**
   * PRD-C103: replacement and revocation both have to reach the viewer. An
   * `immutable` entry is never revalidated for its whole lifetime, so a replaced
   * object keeps serving the old bytes and a viewer whose permission was revoked
   * keeps serving the image out of its own cache — the authorization recheck at
   * `/storage/image` is simply never asked.
   */
  it("never marks a tenant object immutable, and varies on the session cookie", async () => {
    mockFetch.mockResolvedValue(upstreamOk("image/png"));

    const response = await GET(imgTagRequest(KEY));

    expect(response.headers.get("cache-control")).not.toContain("immutable");
    expect(response.headers.get("cache-control")).toContain("must-revalidate");
    expect(response.headers.get("vary")).toBe("Cookie");
  });
});

describe("authorization stays at the data layer", () => {
  it("refuses a key belonging to another organisation with the API's own answer", async () => {
    mockFetch.mockResolvedValue(upstreamError(404));

    const response = await GET(imgTagRequest(FOREIGN_KEY));

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(new Uint8Array(await response.arrayBuffer())).not.toEqual(PNG_BYTES);
  });

  it("still asks the API for a foreign key rather than deciding locally", async () => {
    mockFetch.mockResolvedValue(upstreamError(404));

    await GET(imgTagRequest(FOREIGN_KEY));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0]?.[0]).toContain(encodeURIComponent(FOREIGN_KEY));
  });

  it("passes a same-tenant forbidden through instead of downgrading it", async () => {
    mockFetch.mockResolvedValue(upstreamError(403));

    expect((await GET(imgTagRequest(KEY))).status).toBe(403);
  });

  it("401s without a session and never reaches the API", async () => {
    mockedGetServerAuth.mockResolvedValue(session(undefined));

    const response = await GET(imgTagRequest(KEY));

    expect(response.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("401s when there is no session at all", async () => {
    mockedGetServerAuth.mockResolvedValue(null);

    expect((await GET(imgTagRequest(KEY))).status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("the key is untrusted input", () => {
  it.each([
    ["a traversal", `${ORG_A}/uploads/../../etc/passwd`],
    ["an absolute URL", "https://evil.test/a.png"],
    ["a leading slash", `/${KEY}`],
    ["a backslash", `${ORG_A}\\uploads\\a.png`],
    ["an empty key", ""],
  ])("400s %s without calling the API", async (_label, key) => {
    const response = await GET(imgTagRequest(key));

    expect(response.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("400s a missing key", async () => {
    const response = await GET(new Request("https://app.test/api/media/image"));

    expect(response.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("same-origin content is never allowed to become first-party markup", () => {
  it.each(["text/html", "image/svg+xml", "application/pdf"])(
    "downgrades %s to an opaque download",
    async (contentType) => {
      mockFetch.mockResolvedValue(upstreamOk(contentType));

      const response = await GET(imgTagRequest(KEY));

      expect(response.headers.get("content-type")).toBe("application/octet-stream");
      expect(response.headers.get("content-disposition")).toBe("attachment");
    },
  );

  it("marks a real image inline, nosniff and script-free", async () => {
    mockFetch.mockResolvedValue(upstreamOk("image/jpeg; charset=binary"));

    const response = await GET(imgTagRequest(KEY));

    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("content-disposition")).toBe("inline");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-security-policy")).toBe(
      "default-src 'none'; sandbox",
    );
  });
});

describe("upstream failure modes", () => {
  it("504s when the API never answers", async () => {
    mockFetch.mockRejectedValue(new Error("timed out"));

    expect((await GET(imgTagRequest(KEY))).status).toBe(504);
  });

  it("502s a 200 with no body", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

    expect((await GET(imgTagRequest(KEY))).status).toBe(502);
  });
});
