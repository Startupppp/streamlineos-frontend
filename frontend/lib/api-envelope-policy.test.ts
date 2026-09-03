import { z } from "zod";
import {
  isContractViolation,
  parseApiResponse,
  type ApiResponseLike,
} from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { readErrorReachesBoundary } from "@/lib/query-error-policy";
import {
  resetErrorReporter,
  setErrorReporter,
} from "@/lib/observability/error-reporter";

/**
 * What a contract violation DOES, pinned.
 *
 * `lib/api-envelope-contract.test.ts` asserts that violations are DETECTED.
 * This asserts the decision taken about them, which is the part a future change
 * is most likely to quietly reverse: it throws, on writes as well as reads,
 * with no severity dial and no environment switch. See the block comment on
 * `rejectContractViolation` for why, and for the read/write asymmetry that was
 * considered and rejected because of `POST /organization/switch`.
 */

/** The real body of `POST /organization/switch`: what the active org is set from. */
const orgSwitchContract = z.object({
  organizationId: z.string(),
  role: z.string(),
  token: z.string(),
});

const VALID_SWITCH = {
  organizationId: "org-b",
  role: "OWNER",
  token: "jwt-for-org-b",
};

function jsonResponse(status: number, body: unknown): ApiResponseLike {
  return { ok: status >= 200 && status < 300, status, statusText: "", json: async () => body };
}

async function rejectionFrom(
  res: ApiResponseLike,
  contract: z.ZodType,
  resource: string,
): Promise<unknown> {
  try {
    await parseApiResponse(res, contract, resource);
  } catch (error) {
    return error;
  }
  throw new Error("expected a rejection and got a value");
}

let reported = 0;

beforeEach(() => {
  reported = 0;
  setErrorReporter({
    report: ({ error }) => {
      if (isContractViolation(error)) reported += 1;
    },
  });
});

afterEach(resetErrorReporter);

describe("a contract violation fails closed on a WRITE, not only on a read", () => {
  it("rejects a switch response whose org id was renamed", async () => {
    const error = await rejectionFrom(
      jsonResponse(200, { orgId: "org-b", role: "OWNER", token: "jwt-for-org-b" }),
      orgSwitchContract,
      "/organization/switch",
    );

    expect(isContractViolation(error)).toBe(true);
    if (!isContractViolation(error)) throw new Error("unreachable");
    expect(error.resource).toBe("/organization/switch");
    expect(error.issues.map((issue) => issue.path)).toEqual(["organizationId"]);
  });

  it("does not hand back the payload it could not verify", async () => {
    let leaked: unknown = "untouched";
    try {
      leaked = await parseApiResponse(
        jsonResponse(200, { ...VALID_SWITCH, token: 12345 }),
        orgSwitchContract,
        "/organization/switch",
      );
    } catch {
      // the throw is the point
    }

    expect(leaked).toBe("untouched");
  });

  it("accepts the body the route really sends", async () => {
    await expect(
      parseApiResponse(jsonResponse(200, VALID_SWITCH), orgSwitchContract, "/organization/switch"),
    ).resolves.toEqual(VALID_SWITCH);
    expect(reported).toBe(0);
  });
});

describe("the policy has no dial", () => {
  it("throws under NODE_ENV=production exactly as it does in test", async () => {
    const original = process.env.NODE_ENV;
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
    try {
      const error = await rejectionFrom(
        jsonResponse(200, { organizationId: "org-b", role: "OWNER" }),
        orgSwitchContract,
        "/organization/switch",
      );
      expect(isContractViolation(error)).toBe(true);
    } finally {
      Object.defineProperty(process.env, "NODE_ENV", { value: original, configurable: true });
    }
  });

  it("an added backend field is a backward-compatible deploy and still passes", async () => {
    await expect(
      parseApiResponse(
        jsonResponse(200, { ...VALID_SWITCH, seatCount: 42 }),
        orgSwitchContract,
        "/organization/switch",
      ),
    ).resolves.toEqual(VALID_SWITCH);
    expect(reported).toBe(0);
  });
});

describe("failing closed is survivable because it lands where every other error does", () => {
  it("reaches the screen as a message rather than a raw ZodError", async () => {
    const error = await rejectionFrom(
      jsonResponse(200, {}),
      orgSwitchContract,
      "/organization/switch",
    );

    expect(getErrorMessage(error)).toMatch(/does not understand/i);
    expect(String(error)).not.toMatch(/ZodError/);
  });

  it("is reported once, with the resource, rather than swallowed", async () => {
    await rejectionFrom(jsonResponse(200, {}), orgSwitchContract, "/organization/switch");

    expect(reported).toBe(1);
  });

  it("routes through the same read-error policy as a 500", async () => {
    const error = await rejectionFrom(
      jsonResponse(200, {}),
      orgSwitchContract,
      "/organization/switch",
    );
    const empty = { state: { data: undefined } };
    const holdingData = { state: { data: [{ id: 1 }] } };

    expect(readErrorReachesBoundary(error, empty)).toBe(
      readErrorReachesBoundary(new Error("boom"), empty),
    );
    expect(readErrorReachesBoundary(error, holdingData)).toBe(false);
  });
});
