import {
  ApiError,
  isApiError,
  parseApiResponse,
  type ApiResponseLike,
} from "@/lib/api-envelope";
import { ApiError as ClientApiError } from "@/lib/api-client";

function jsonResponse(status: number, body: unknown): ApiResponseLike {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    json: async () => body,
  };
}

function nonJsonResponse(status: number): ApiResponseLike {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "Bad Gateway",
    json: async () => {
      throw new SyntaxError("Unexpected token < in JSON");
    },
  };
}

function noContentResponse(): ApiResponseLike {
  return { ok: true, status: 204, statusText: "No Content", json: async () => null };
}

async function errorFrom(res: ApiResponseLike): Promise<ApiError> {
  try {
    await parseApiResponse(res);
  } catch (error) {
    if (isApiError(error)) return error;
    throw error;
  }
  throw new Error("expected parseApiResponse to throw");
}

describe("parseApiResponse — success shapes", () => {
  it("unwraps a success envelope to its data", async () => {
    const parsed = await parseApiResponse(jsonResponse(200, { success: true, data: { id: 7 } }));
    expect(parsed).toEqual({ id: 7 });
  });

  it("returns a bare body unchanged", async () => {
    const parsed = await parseApiResponse(jsonResponse(200, { id: 7 }));
    expect(parsed).toEqual({ id: 7 });
  });

  it("returns nothing for a no-content response", async () => {
    const parsed = await parseApiResponse(noContentResponse());
    expect(parsed).toBeUndefined();
  });
});

describe("parseApiResponse — failure shapes", () => {
  it("carries the backend message and code", async () => {
    const error = await errorFrom(
      jsonResponse(403, { message: "Permission denied", code: "FORBIDDEN" }),
    );
    expect({ message: error.message, status: error.status, code: error.code }).toEqual({
      message: "Permission denied",
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("joins a validation message array", async () => {
    const error = await errorFrom(jsonResponse(400, { message: ["name required", "email invalid"] }));
    expect(error.message).toBe("name required, email invalid");
  });

  it("falls back to the status line when the body carries no message", async () => {
    const error = await errorFrom(jsonResponse(500, {}));
    expect(error.status).toBe(500);
  });

  it("survives a body that is not JSON", async () => {
    const error = await errorFrom(nonJsonResponse(502));
    expect(error.status).toBe(502);
  });

  it("keeps the payment-required code the upgrade prompt reads", async () => {
    const error = await errorFrom(
      jsonResponse(402, { message: "Module disabled", code: "MODULE_DISABLED" }),
    );
    expect({ status: error.status, code: error.code }).toEqual({
      status: 402,
      code: "MODULE_DISABLED",
    });
  });

  it("carries status 401", async () => {
    const error = await errorFrom(jsonResponse(401, { message: "Unauthorized" }));
    expect(error.status).toBe(401);
    expect(error.message).toBe("Unauthorized");
  });

  it("carries status 404", async () => {
    const error = await errorFrom(jsonResponse(404, { message: "Not found" }));
    expect(error.status).toBe(404);
    expect(error.message).toBe("Not found");
  });

  it("carries status 409", async () => {
    const error = await errorFrom(jsonResponse(409, { message: "Conflict", code: "CONFLICT" }));
    expect({ status: error.status, code: error.code }).toEqual({
      status: 409,
      code: "CONFLICT",
    });
  });
});

describe("the two paths cannot disagree", () => {
  it("api-client re-exports the same ApiError, so isApiError holds across both", () => {
    expect(ClientApiError).toBe(ApiError);
  });

  it("recognises an error thrown by the shared parser", async () => {
    const error = await errorFrom(jsonResponse(409, { message: "Conflict", code: "CONFLICT" }));
    expect(isApiError(error)).toBe(true);
    expect(error).toBeInstanceOf(ClientApiError);
  });

  it.each([
    [401, { message: "Unauthorized" }],
    [402, { message: "Payment required", code: "PAYMENT_REQUIRED" }],
    [403, { message: "Forbidden" }],
    [404, { message: "Not found" }],
    [409, { message: "Conflict" }],
    [500, {}],
  ] as const)(
    "status %i: server and client paths produce the same ApiError shape",
    async (status, body) => {
      const error = await errorFrom(jsonResponse(status, body));
      expect(error.status).toBe(status);
      expect(isApiError(error)).toBe(true);
      expect(error).toBeInstanceOf(ClientApiError);
    },
  );
});
