/**
 * @jest-environment node
 *
 * A NEGATIVE test for the public-form read seam.
 *
 * The defect this pins is not hypothetical: `app/(public)/forms/[token]/page.tsx`
 * used to end `fetchPublicForm` with
 *
 *     return res.json() as Promise<PublicFormDefinition>;
 *
 * The backend's global `ResponseTransformInterceptor` wraps EVERY handler return
 * as `{ success: true, data }` unless it already carries a `success` key, and
 * `getFormByToken` returns a bare Drizzle row. So the value that actually
 * resolved was the envelope, not the form: `form.name` was undefined (the header
 * stayed on "Loading form…") and `form.fields.length` threw a TypeError. Both
 * repositories typechecked clean throughout, which is exactly why a typecheck is
 * not the proof here.
 *
 * Every assertion below is written so it FAILS if that cast comes back, rather
 * than merely restating the type:
 *
 *   1. the wire body really is a different shape from the declared type — proved
 *      by handing the raw envelope to the contract and requiring a rejection.
 *      Without this, assertion 2 could pass vacuously on a payload that happened
 *      to be shaped like the form already.
 *   2. reading through `parseApiResponse` unwraps it and yields the form.
 *   3. a renamed or dropped field is REJECTED rather than surfacing as
 *      undefined — the property the cast could never have.
 */
import {
  intakeSubmitResponseContract,
} from "@/features/build/intake/public-intake-schema";
import {
  publicFormDefinitionContract,
  publicFormSubmitResponseContract,
} from "@/features/build/forms/form-submission-schema";
import { isContractViolation, parseApiResponse } from "@/lib/api-envelope";
import {
  fetchPublicForm,
  submitPublicForm,
} from "@/features/build/forms/public-form-api";
import { submitIntake } from "@/features/build/intake/public-intake-api";

/** Exactly what `getFormByToken` returns, before the interceptor sees it. */
const FORM_ROW = {
  id: 42,
  name: "Client onboarding",
  description: "Tell us about your project",
  type: "INTAKE",
  fields: [
    { key: "company", label: "Company", type: "text", required: true },
    { key: "budget", label: "Budget", type: "number", required: false },
  ],
};

/** Exactly what leaves the server: the interceptor's envelope around that row. */
const WIRE_BODY = { success: true, data: FORM_ROW };

async function contractViolationFrom(promise: Promise<unknown>): Promise<boolean> {
  try {
    await promise;
    return false;
  } catch (error) {
    return isContractViolation(error);
  }
}

function response(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    json: async () => body,
  };
}

describe("the envelope is a different shape from the declared type", () => {
  it("rejects the raw wire body against the form contract", () => {
    // If this ever passes, the interceptor stopped wrapping and assertion 2
    // below would no longer be evidence of anything.
    expect(publicFormDefinitionContract.safeParse(WIRE_BODY).success).toBe(false);
  });

  it("has none of the form's fields on the envelope", () => {
    const asAsserted = WIRE_BODY as unknown as { name?: unknown; fields?: unknown };
    expect(asAsserted.name).toBeUndefined();
    expect(asAsserted.fields).toBeUndefined();
  });

  it("throws the TypeError the page threw, if the envelope is read as the form", () => {
    const asAsserted = WIRE_BODY as unknown as { fields: unknown[] };
    expect(() => asAsserted.fields.length).toThrow(TypeError);
  });
});

describe("reading through parseApiResponse", () => {
  it("unwraps the envelope and returns the form itself", async () => {
    const form = await parseApiResponse(
      response(WIRE_BODY),
      publicFormDefinitionContract,
      "/public/forms/t",
    );

    expect(form.name).toBe("Client onboarding");
    expect(form.fields).toHaveLength(2);
    expect(form.fields[0]?.key).toBe("company");
  });

  it("still accepts a bare body, so an un-enveloped route keeps working", async () => {
    const form = await parseApiResponse(
      response(FORM_ROW),
      publicFormDefinitionContract,
      "/public/forms/t",
    );

    expect(form.id).toBe(42);
  });
});

describe("a shape change is an error, not an undefined", () => {
  it("rejects a renamed field", async () => {
    const { name: _dropped, ...rest } = FORM_ROW;
    await expect(
      contractViolationFrom(
        parseApiResponse(
          response({ success: true, data: { ...rest, title: "Client onboarding" } }),
          publicFormDefinitionContract,
          "/public/forms/t",
        ),
      ),
    ).resolves.toBe(true);
  });

  it("rejects a field whose element shape drifted", async () => {
    await expect(
      contractViolationFrom(
        parseApiResponse(
          response({
            success: true,
            data: { ...FORM_ROW, fields: [{ key: "company", label: "Company" }] },
          }),
          publicFormDefinitionContract,
          "/public/forms/t",
        ),
      ),
    ).resolves.toBe(true);
  });

  it("names the path of the offending field so the report is actionable", async () => {
    expect.assertions(1);
    try {
      await parseApiResponse(
        response({ success: true, data: { ...FORM_ROW, id: "42" } }),
        publicFormDefinitionContract,
        "/public/forms/t",
      );
    } catch (error) {
      const issues = isContractViolation(error) ? error.issues : [];
      expect(issues.map((issue) => issue.path)).toContain("id");
    }
  });
});

describe("the two submit seams carry the same envelope", () => {
  it("unwraps the form submit response", async () => {
    const result = await parseApiResponse(
      response({ success: true, data: { id: 7, message: "Submission received" } }),
      publicFormSubmitResponseContract,
      "/public/forms/t/submit",
    );

    expect(result.id).toBe(7);
  });

  it("unwraps the intake submit response", async () => {
    const result = await parseApiResponse(
      response({ success: true, data: { id: 9, message: "Request submitted" } }),
      intakeSubmitResponseContract,
      "/public/intake/1",
    );

    expect(result.message).toBe("Request submitted");
  });

  it("rejects an intake response that lost its id", async () => {
    await expect(
      contractViolationFrom(
        parseApiResponse(
          response({ success: true, data: { message: "Request submitted" } }),
          intakeSubmitResponseContract,
          "/public/intake/1",
        ),
      ),
    ).resolves.toBe(true);
  });
});

/**
 * The three real call sites, driven through a stubbed `fetch` that returns
 * exactly what the server sends. These are the assertions that bite on a
 * revert: put `res.json() as Promise<T>` back into any of the three and the
 * resolved value becomes the envelope, so `form.name` is undefined and each
 * `expect` below fails.
 */
describe("the real call sites resolve the payload, not the envelope", () => {
  const originalFetch = global.fetch;

  function stubFetch(body: unknown, status = 200) {
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    ) as unknown as typeof fetch;
  }

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("fetchPublicForm returns the form, with fields, from an enveloped body", async () => {
    stubFetch(WIRE_BODY);

    const form = await fetchPublicForm("tok");

    expect(form.name).toBe("Client onboarding");
    expect(form.fields).toHaveLength(2);
    // The page renders `form.fields.length` unguarded; on the envelope this threw.
    expect(() => form.fields.length).not.toThrow();
  });

  it("fetchPublicForm rejects a drifted body instead of returning undefined fields", async () => {
    stubFetch({ success: true, data: { ...FORM_ROW, fields: "not-an-array" } });

    await expect(contractViolationFrom(fetchPublicForm("tok"))).resolves.toBe(true);
  });

  it("fetchPublicForm keeps the backend message on a failure", async () => {
    stubFetch({ message: "Form not found or no longer active" }, 404);

    await expect(fetchPublicForm("tok")).rejects.toThrow(
      "Form not found or no longer active",
    );
  });

  it("submitPublicForm returns the submission id from an enveloped body", async () => {
    stubFetch({ success: true, data: { id: 7, message: "Submission received" } });

    await expect(submitPublicForm("tok", { company: "Acme" })).resolves.toEqual({
      id: 7,
      message: "Submission received",
    });
  });

  it("submitIntake returns the item id from an enveloped body", async () => {
    stubFetch({ success: true, data: { id: 9, message: "Request submitted" } });

    await expect(
      submitIntake("1", { title: "Broken login" }),
    ).resolves.toEqual({ id: 9, message: "Request submitted" });
  });
});
