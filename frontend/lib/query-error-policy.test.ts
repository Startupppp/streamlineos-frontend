import { createAppQueryClient } from "@/components/providers/query-provider";
import { ApiError } from "@/lib/api-envelope";
import {
  INLINE_READ_ERROR,
  isTransientNetworkError,
  projectReadErrorReachesBoundary,
  readErrorReachesBoundary,
} from "@/lib/query-error-policy";

const nothingRendered = { state: { data: undefined } };
const alreadyRendered = { state: { data: [{ id: 1 }] } };

describe("which read failures reach the route error boundary", () => {
  it("throws a server failure that produced nothing, so it cannot be rendered as a zero", () => {
    expect(
      readErrorReachesBoundary(new ApiError("boom", 500), nothingRendered),
    ).toBe(true);
  });

  it("throws a network failure, a timeout and a non-api error the same way", () => {
    expect(
      readErrorReachesBoundary(
        new ApiError("offline", undefined, "NETWORK_ERROR"),
        nothingRendered,
      ),
    ).toBe(true);
    expect(
      readErrorReachesBoundary(
        new ApiError("slow", undefined, "TIMEOUT"),
        nothingRendered,
      ),
    ).toBe(true);
    expect(readErrorReachesBoundary(new Error("parse"), nothingRendered)).toBe(
      true,
    );
  });

  it("throws an unmapped client failure that reached the wire, because an ungated read is a bug and a zero hides it", () => {
    expect(
      readErrorReachesBoundary(new ApiError("gone", 404), nothingRendered),
    ).toBe(true);
  });

  it("keeps a permission denial inline rather than calling it an unexpected error", () => {
    expect(
      readErrorReachesBoundary(new ApiError("forbidden", 403), nothingRendered),
    ).toBe(false);
  });

  it("keeps a plan denial inline, because Try Again can never resolve one", () => {
    const error = new ApiError("nope", 402, "MODULE_NOT_ENABLED", {
      moduleKey: "feedbucket",
      reason: "org-disabled",
      upgradePath: null,
    });
    expect(readErrorReachesBoundary(error, nothingRendered)).toBe(false);
  });

  it("never throws once the query holds data — a failed background refresh keeps the screen", () => {
    for (const error of [
      new ApiError("boom", 500),
      new ApiError("offline", undefined, "NETWORK_ERROR"),
      new ApiError("forbidden", 403),
      new Error("parse"),
    ])
      expect(readErrorReachesBoundary(error, alreadyRendered)).toBe(false);
  });

  it("never throws a cancellation — a navigation aborting its own request is not a failure", () => {
    expect(
      readErrorReachesBoundary(
        new ApiError("Request was cancelled.", undefined, "ABORTED"),
        nothingRendered,
      ),
    ).toBe(false);
  });

  it("never throws a 401, because the client is already signing the session out", () => {
    expect(
      readErrorReachesBoundary(
        new ApiError("unauthorized", 401),
        nothingRendered,
      ),
    ).toBe(false);
  });

  it("never throws a suspended-membership 403, because the client is already leaving for /access-suspended", () => {
    for (const code of ["ORG_MEMBERSHIP_INACTIVE", "ORG_MEMBERSHIP_SUSPENDED"])
      expect(
        readErrorReachesBoundary(
          new ApiError("suspended", 403, code),
          nothingRendered,
        ),
      ).toBe(false);
  });
});

describe("project lookup failures", () => {
  it("keeps a missing project inline so shell lookups cannot crash an invalid project route", () => {
    expect(
      projectReadErrorReachesBoundary(
        new ApiError("Project not found", 404, "PROJECTS_NOT_FOUND"),
        nothingRendered,
      ),
    ).toBe(false);
  });

  it("still sends an unavailable project service to the route error boundary", () => {
    expect(
      projectReadErrorReachesBoundary(
        new ApiError("Unavailable", 503, "BACKEND_UNREACHABLE"),
        nothingRendered,
      ),
    ).toBe(true);
  });
});

describe("the policy is installed, not merely available", () => {
  it("is the app query client's query default", () => {
    const queries = createAppQueryClient().getDefaultOptions().queries;

    expect(queries?.throwOnError).toBe(readErrorReachesBoundary);
  });

  it("leaves mutations to their own onError — a failed write is a toast, not a blank route", () => {
    const client = createAppQueryClient();

    expect(client.getDefaultOptions().mutations?.throwOnError).toBe(false);
  });

  it("offers one opt-out, for a panel that renders its own failure", () => {
    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
  });
});

describe("transient server failures", () => {
  it("retries a failed server-side access snapshot", () => {
    const error = new Error("Could not load your permissions. Please try again.");
    error.name = "AccessUnavailableError";
    expect(isTransientNetworkError(error)).toBe(true);
  });

  it("retries normalized server fetch failures", () => {
    expect(
      isTransientNetworkError(
        new ApiError("slow", 503, "BACKEND_UNREACHABLE"),
      ),
    ).toBe(true);
  });
});
