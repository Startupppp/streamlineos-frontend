import { z } from "zod";
import {
  ApiContractError,
  ApiError,
  CONTRACT_VIOLATION_CODE,
  isApiError,
  isContractViolation,
  parseApiResponse,
  type ApiResponseLike,
} from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { readErrorReachesBoundary } from "@/lib/query-error-policy";
import { resetErrorReporter, setErrorReporter } from "@/lib/observability/error-reporter";

const walletContract = z.object({
  balance: z.number(),
  currency: z.string(),
  owner: z.object({ id: z.string(), email: z.string() }),
});

type Wallet = z.infer<typeof walletContract>;

const VALID_WALLET: Wallet = {
  balance: 1250,
  currency: "INR",
  owner: { id: "u-1", email: "a@b.test" },
};

function jsonResponse(status: number, body: unknown): ApiResponseLike {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    json: async () => body,
  };
}

function envelope(body: unknown): ApiResponseLike {
  return jsonResponse(200, { success: true, data: body });
}

async function rejectionFrom(res: ApiResponseLike, contract: z.ZodType): Promise<unknown> {
  try {
    await parseApiResponse(res, contract, "/billing/wallet");
  } catch (error) {
    return error;
  }
  throw new Error("expected parseApiResponse to reject");
}

afterEach(() => {
  resetErrorReporter();
});

describe("a malformed backend response is rejected", () => {
  it("rejects a renamed field rather than handing back an undefined", async () => {
    const renamed = { balance: 1250, currencyCode: "INR", owner: VALID_WALLET.owner };
    const error = await rejectionFrom(envelope(renamed), walletContract);

    expect(isContractViolation(error)).toBe(true);
    if (!isContractViolation(error)) throw new Error("unreachable");
    expect(error.issues.map((issue) => issue.path)).toContain("currency");
  });

  it("rejects a retyped field — the number that arrives as a string", async () => {
    const retyped = { ...VALID_WALLET, balance: "1250" };
    const error = await rejectionFrom(envelope(retyped), walletContract);

    expect(isContractViolation(error)).toBe(true);
    if (!isContractViolation(error)) throw new Error("unreachable");
    expect(error.issues.map((issue) => issue.path)).toContain("balance");
  });

  it("rejects a removed nested field", async () => {
    const removed = { ...VALID_WALLET, owner: { id: "u-1" } };
    const error = await rejectionFrom(envelope(removed), walletContract);

    expect(isContractViolation(error)).toBe(true);
    if (!isContractViolation(error)) throw new Error("unreachable");
    expect(error.issues.map((issue) => issue.path)).toContain("owner.email");
  });

  it("rejects null where an object is contracted", async () => {
    expect(isContractViolation(await rejectionFrom(envelope(null), walletContract))).toBe(true);
  });

  it("rejects an array where an object is contracted", async () => {
    expect(isContractViolation(await rejectionFrom(envelope([VALID_WALLET]), walletContract))).toBe(
      true,
    );
  });

  it("rejects a bare 200 body that skipped the success envelope", async () => {
    const error = await rejectionFrom(jsonResponse(200, { nope: true }), walletContract);
    expect(isContractViolation(error)).toBe(true);
  });

  it("rejects an empty 204 body when the caller contracted a value", async () => {
    const noContent: ApiResponseLike = {
      ok: true,
      status: 204,
      statusText: "No Content",
      json: async () => null,
    };
    expect(isContractViolation(await rejectionFrom(noContent, walletContract))).toBe(true);
  });

  it("rejects a bad element inside a list and names its index", async () => {
    const listContract = z.array(walletContract);
    const error = await rejectionFrom(
      envelope([VALID_WALLET, { ...VALID_WALLET, balance: null }]),
      listContract,
    );
    expect(isContractViolation(error)).toBe(true);
    if (!isContractViolation(error)) throw new Error("unreachable");
    expect(error.issues.map((issue) => issue.path)).toContain("1.balance");
  });

  it("rejects a permission map whose scope left the enum", async () => {
    const accessContract = z.object({
      scopes: z.record(z.string(), z.enum(["all", "team", "own", "none"])),
      isOrgOwner: z.boolean(),
    });
    const error = await rejectionFrom(
      envelope({ scopes: { "hr:employees:view": "everything" }, isOrgOwner: false }),
      accessContract,
    );
    expect(isContractViolation(error)).toBe(true);
  });
});

describe("without a contract the same bodies are accepted silently", () => {
  it("hands back a renamed field as an undefined — the defect the contract removes", async () => {
    const renamed = { balance: 1250, currencyCode: "INR", owner: VALID_WALLET.owner };
    const parsed = await parseApiResponse<Wallet>(envelope(renamed));

    expect(parsed.currency).toBeUndefined();
    expect(parsed.balance).toBe(1250);
  });
});

describe("a contract violation is a typed error, not a raw ZodError", () => {
  it("is an ApiError carrying CONTRACT_VIOLATION and the resource", async () => {
    const error = await rejectionFrom(envelope({}), walletContract);

    expect(error).toBeInstanceOf(ApiContractError);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(Error);
    expect(isApiError(error)).toBe(true);
    if (!isContractViolation(error)) throw new Error("unreachable");
    expect(error.code).toBe(CONTRACT_VIOLATION_CODE);
    expect(error.status).toBe(200);
    expect(error.resource).toBe("/billing/wallet");
    expect(error.name).toBe("ApiContractError");
  });

  it("renders through getErrorMessage as a sentence, never a Zod dump", async () => {
    const error = await rejectionFrom(envelope({}), walletContract);
    const message = getErrorMessage(error);

    expect(message).toContain("does not understand");
    expect(message).not.toMatch(/invalid_type|ZodError|\[object Object\]/);
    expect(message).not.toBe("Something went wrong. Please try again.");
  });

  it("reaches the route error boundary when the read produced nothing", async () => {
    const error = await rejectionFrom(envelope({}), walletContract);
    expect(readErrorReachesBoundary(error, { state: { data: undefined } })).toBe(true);
  });

  it("keeps a working screen up when a background refresh violates the contract", async () => {
    const error = await rejectionFrom(envelope({}), walletContract);
    expect(readErrorReachesBoundary(error, { state: { data: VALID_WALLET } })).toBe(false);
  });

  it("is reported to observability with the resource and the issue paths", async () => {
    const reports: Array<{ error: unknown; extra?: Record<string, unknown> }> = [];
    setErrorReporter({ report: (report) => reports.push(report) });

    await rejectionFrom(envelope({ ...VALID_WALLET, balance: "1250" }), walletContract);

    expect(reports).toHaveLength(1);
    expect(reports[0]?.extra?.resource).toBe("/billing/wallet");
  });

  it("caps the issue list so a wholly wrong body cannot flood a report", async () => {
    const wide = z.object(
      Object.fromEntries(
        Array.from({ length: 40 }, (_, index) => [`f${index}`, z.string()]),
      ),
    );
    const error = await rejectionFrom(envelope({}), wide);
    if (!isContractViolation(error)) throw new Error("unreachable");
    expect(error.issues.length).toBe(10);
  });
});

describe("a valid response still passes through unchanged", () => {
  it("unwraps the success envelope and returns the parsed value", async () => {
    const parsed = await parseApiResponse(envelope(VALID_WALLET), walletContract, "/billing/wallet");
    expect(parsed).toEqual(VALID_WALLET);
  });

  it("accepts a bare body with no success envelope", async () => {
    const parsed = await parseApiResponse(
      jsonResponse(200, VALID_WALLET),
      walletContract,
      "/billing/wallet",
    );
    expect(parsed).toEqual(VALID_WALLET);
  });

  it("accepts an added backend field, because additive deploys are compatible", async () => {
    const added = { ...VALID_WALLET, newlyAddedByBackend: "ignored" };
    const parsed = await parseApiResponse(envelope(added), walletContract, "/billing/wallet");
    expect(parsed).toEqual(VALID_WALLET);
  });

  it("infers the hook's type from the contract with no hand-written interface", async () => {
    const parsed = await parseApiResponse(envelope(VALID_WALLET), walletContract, "/x");
    const balance: number = parsed.balance;
    const email: string = parsed.owner.email;
    expect(balance).toBe(1250);
    expect(email).toBe("a@b.test");
  });

  it("accepts a 204 when the contract admits undefined", async () => {
    const noContent: ApiResponseLike = {
      ok: true,
      status: 204,
      statusText: "No Content",
      json: async () => null,
    };
    const parsed = await parseApiResponse(noContent, z.undefined(), "/x");
    expect(parsed).toBeUndefined();
  });
});

describe("an HTTP failure is still an ApiError, not a contract violation", () => {
  it("keeps the backend message and never runs the contract", async () => {
    const error = await rejectionFrom(
      jsonResponse(403, { message: "Forbidden resource", code: "FORBIDDEN" }),
      walletContract,
    );
    expect(isContractViolation(error)).toBe(false);
    expect(isApiError(error)).toBe(true);
    if (!isApiError(error)) throw new Error("unreachable");
    expect(error.status).toBe(403);
    expect(error.message).toBe("Forbidden resource");
  });
});
