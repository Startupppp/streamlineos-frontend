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
});
