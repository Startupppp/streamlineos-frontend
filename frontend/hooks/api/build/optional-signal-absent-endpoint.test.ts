import { ApiError } from "@/lib/api-client";
import { optionalSignalRead } from "@/lib/query-error-policy";

describe("optionalSignalRead — an optional Build signal survives a backend that has not shipped its endpoint", () => {
  it("resolves to null when the endpoint is absent, so version skew renders nothing instead of an error", async () => {
    const absent = Promise.reject(
      new ApiError("Cannot GET /build/agent-pulse/top-signal", 404, "NOT_FOUND"),
    );
    await expect(optionalSignalRead(absent)).resolves.toBeNull();
  });

  it("still rejects a 500 so a genuine backend fault is never disguised as no signal", async () => {
    const broken = Promise.reject(
      new ApiError("Internal Server Error", 500, "INTERNAL"),
    );
    await expect(optionalSignalRead(broken)).rejects.toBeInstanceOf(ApiError);
  });

  it("still rejects a 403 so a permission failure is never disguised as no signal", async () => {
    const denied = Promise.reject(new ApiError("Forbidden", 403, "FORBIDDEN"));
    await expect(optionalSignalRead(denied)).rejects.toBeInstanceOf(ApiError);
  });

  it("passes a successful payload through untouched", async () => {
    const signal = { type: "overdue_approval", entityId: 1 };
    await expect(optionalSignalRead(Promise.resolve(signal))).resolves.toBe(
      signal,
    );
  });

  it("passes a legitimate null through, which is how the backend reports a quiet pulse", async () => {
    await expect(optionalSignalRead(Promise.resolve(null))).resolves.toBeNull();
  });
});
