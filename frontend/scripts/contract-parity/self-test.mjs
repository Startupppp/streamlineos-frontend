import { z } from "zod";
import { toJsonSchema } from "./load-contracts.mjs";
import { routePattern } from "./schema-diff.mjs";

const TICKET_ROUTE = "/build/{projectId}/tickets";

function envelope(payload) {
  return {
    responses: {
      200: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { success: { type: "boolean", enum: [true] }, data: payload },
              required: ["success", "data"],
            },
          },
        },
      },
    },
  };
}

function document(path, method, payload) {
  return { paths: { [path]: { [method]: envelope(payload) } } };
}

const deployedTicketPage = {
  type: "object",
  properties: {
    data: {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "integer" }, title: { type: "string" } },
        required: ["id", "title"],
      },
    },
    pagination: {
      type: "object",
      properties: { limit: { type: "integer" }, hasMore: { type: "boolean" }, nextCursor: { anyOf: [{ type: "string" }, { type: "null" }] } },
      required: ["limit", "hasMore", "nextCursor"],
    },
  },
  required: ["data", "pagination"],
};

function record(schema, route = "/build/*/tickets", method = "get") {
  const converted = toJsonSchema(schema);
  if (!converted.ok) throw new Error(`fixture contract did not convert: ${converted.reason}`);
  return {
    route,
    method,
    file: "hooks/api/build/ticket-queries.ts",
    line: 42,
    contractKey: "fixture",
    contractFile: "hooks/api/build/build-tickets-schema.ts",
    contractName: "ticketListPageContract",
    schema: converted.schema,
  };
}

const paginationContract = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

function ticketPageContract(rowExtension) {
  return z.object({
    data: z.array(z.object({ id: z.number().int(), title: z.string(), ...rowExtension })),
    pagination: paginationContract,
  });
}

export function runSelfTest(evaluate, floorFailures, partitionFindings, staleFailures, checkDbCoverage, baselineAdditions) {
  const checks = [];
  const assert = (label, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    checks.push({ label, ok, actual, expected });
  };

  const shipped = evaluate(
    [record(ticketPageContract({ descriptionExcerpt: z.string() }))],
    document(TICKET_ROUTE, "get", deployedTicketPage),
  );
  assert(
    "the shipped outage is reported: a required descriptionExcerpt the deployed backend never declares",
    shipped.missing.map((finding) => `${finding.method} ${finding.backendPath} ${finding.fieldPath}`),
    ["get /build/{projectId}/tickets data[].descriptionExcerpt"],
  );

  assert(
    "the landed fix passes: the same field marked .optional() is no longer demanded of the wire",
    evaluate(
      [record(ticketPageContract({ descriptionExcerpt: z.string().optional() }))],
      document(TICKET_ROUTE, "get", deployedTicketPage),
    ).missing.length,
    0,
  );

  assert(
    "a renamed pair is two findings, not a pass: the frontend wants text/order where the deployed backend sends title/position",
    evaluate(
      [
        record(
          z.object({ items: z.array(z.object({ id: z.number().int(), text: z.string(), order: z.number().int() })) }),
          "/build/*/tickets/*/checklists",
        ),
      ],
      document("/build/{projectId}/tickets/{ticketId}/checklists", "get", {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: { id: { type: "integer" }, title: { type: "string" }, position: { type: "integer" } },
              required: ["id", "title", "position"],
            },
          },
        },
        required: ["items"],
      }),
    ).missing.map((finding) => finding.fieldPath),
    ["items[].text", "items[].order"],
  );

  assert(
    "the success envelope is unwrapped before comparing, so a contract written for the payload is not reported as missing everything",
    evaluate([record(ticketPageContract({}))], document(TICKET_ROUTE, "get", deployedTicketPage)).missing.length,
    0,
  );

  assert(
    "a backend field arriving at a .strict() contract is reported on the extras side, where Zod throws on the unknown key",
    evaluate(
      [record(z.object({ id: z.number().int() }).strict(), "/x")],
      document("/x", "get", {
        type: "object",
        properties: { id: { type: "integer" }, surprise: { type: "string" } },
        required: ["id", "surprise"],
      }),
    ).extras.map((finding) => finding.fieldPath),
    ["surprise"],
  );

  assert(
    "the same backend field arriving at a non-strict contract is silently stripped by Zod and is not a failure",
    evaluate(
      [record(z.object({ id: z.number().int() }), "/x")],
      document("/x", "get", {
        type: "object",
        properties: { id: { type: "integer" }, surprise: { type: "string" } },
        required: ["id", "surprise"],
      }),
    ).extras.length,
    0,
  );

  assert(
    "a route the deployed document does not declare is reported unmatched rather than counted as compared",
    evaluate([record(ticketPageContract({}), "/build/*/tickets")], document("/other", "get", deployedTicketPage))
      .unmatchedRoutes.map((finding) => finding.pattern),
    ["/build/*/tickets"],
  );

  assert(
    "a template interpolation matches the backend's named path parameter, and a query string does not split one route into two",
    [routePattern("/build/*/tickets?limit=20"), routePattern(TICKET_ROUTE)],
    ["/build/*/tickets", "/build/*/tickets"],
  );

  assert(
    "the method is part of the match, so a POST contract is never compared against the GET response",
    evaluate([record(ticketPageContract({}), "/build/*/tickets", "post")], document(TICKET_ROUTE, "get", deployedTicketPage))
      .unmatchedRoutes.length,
    1,
  );

  assert(
    "an empty scan fails the floors rather than reporting a clean tree",
    floorFailures({ calls: 0, contracts: 0 }, 0).length,
    3,
  );

  assert(
    "a field missing from an object nested under a property is found, not only one inside an array",
    evaluate(
      [record(z.object({ meta: z.object({ id: z.number().int(), cursor: z.string() }) }), "/x")],
      document("/x", "get", {
        type: "object",
        properties: { meta: { type: "object", properties: { id: { type: "integer" } }, required: ["id"] } },
        required: ["meta"],
      }),
    ).missing.map((finding) => finding.fieldPath),
    ["meta.cursor"],
  );

  assert(
    "a nullable backend object still has its non-null branch compared",
    evaluate(
      [record(z.object({ cycle: z.object({ id: z.number().int(), name: z.string() }).nullable() }), "/x")],
      document("/x", "get", {
        type: "object",
        properties: {
          cycle: {
            anyOf: [{ type: "object", properties: { id: { type: "integer" } }, required: ["id"] }, { type: "null" }],
          },
        },
        required: ["cycle"],
      }),
    ).missing.map((finding) => finding.fieldPath),
    ["cycle.name"],
  );

  const twoFindings = evaluate(
    [record(ticketPageContract({ descriptionExcerpt: z.string(), summary: z.string() }))],
    document(TICKET_ROUTE, "get", deployedTicketPage),
  ).missing;
  const partitioned = partitionFindings(twoFindings, [
    "get /build/{projectId}/tickets data[].descriptionExcerpt",
  ]);
  assert(
    "the frozen debt absorbs only the field it names — the second field on the same route is still a failure",
    [partitioned.frozen.map((finding) => finding.fieldPath), partitioned.fresh.map((finding) => finding.fieldPath)],
    [["data[].descriptionExcerpt"], ["data[].summary"]],
  );

  assert(
    "a baseline entry that no longer reproduces is reported stale rather than silently kept",
    partitionFindings(twoFindings, ["get /build/{projectId}/tickets data[].gone"]).stale,
    ["get /build/{projectId}/tickets data[].gone"],
  );

  assert(
    "a type mismatch is reported when the backend declares string but the frontend expects number",
    evaluate(
      [record(z.object({ count: z.number() }), "/x")],
      document("/x", "get", {
        type: "object",
        properties: { count: { type: "string" } },
        required: ["count"],
      }),
    ).typeMismatches.map((f) => `${f.fieldPath}:${f.kind}`),
    ["count:type"],
  );

  assert(
    "integer from the backend is accepted by a frontend number field — no false positive for the integer subtype",
    evaluate(
      [record(z.object({ count: z.number() }), "/x")],
      document("/x", "get", {
        type: "object",
        properties: { count: { type: "integer" } },
        required: ["count"],
      }),
    ).typeMismatches.length,
    0,
  );

  assert(
    "an enum mismatch is reported when the backend can send a value the frontend enum does not accept",
    evaluate(
      [record(z.object({ status: z.enum(["active", "archived"]) }), "/x")],
      document("/x", "get", {
        type: "object",
        properties: { status: { type: "string", enum: ["active", "archived", "deleted"] } },
        required: ["status"],
      }),
    ).typeMismatches.map((f) => `${f.fieldPath}:${f.kind}`),
    ["status:enum"],
  );

  assert(
    "no enum mismatch when the backend enum is a subset of the frontend enum",
    evaluate(
      [record(z.object({ status: z.enum(["active", "archived", "deleted"]) }), "/x")],
      document("/x", "get", {
        type: "object",
        properties: { status: { type: "string", enum: ["active", "archived"] } },
        required: ["status"],
      }),
    ).typeMismatches.length,
    0,
  );

  assert(
    "a nullability mismatch is reported when the backend can send null but the frontend contract does not accept null",
    evaluate(
      [record(z.object({ tag: z.string() }), "/x")],
      document("/x", "get", {
        type: "object",
        properties: { tag: { anyOf: [{ type: "string" }, { type: "null" }] } },
        required: ["tag"],
      }),
    ).typeMismatches.map((f) => `${f.fieldPath}:${f.kind}`),
    ["tag:nullable"],
  );

  assert(
    "no nullability mismatch when both frontend and backend allow null",
    evaluate(
      [record(z.object({ tag: z.string().nullable() }), "/x")],
      document("/x", "get", {
        type: "object",
        properties: { tag: { anyOf: [{ type: "string" }, { type: "null" }] } },
        required: ["tag"],
      }),
    ).typeMismatches.length,
    0,
  );

  assert(
    "an unconstrained z.unknown() field is not counted as a validated field",
    evaluate(
      [record(z.object({ id: z.number().int(), payload: z.unknown() }).strict(), "/x")],
      document("/x", "get", {
        type: "object",
        properties: { id: { type: "integer" }, payload: { type: "string" } },
        required: ["id", "payload"],
      }),
    ).typeMismatches.length,
    0,
  );

  assert(
    "stale baseline entries cause a gate failure so the baseline can only shrink",
    staleFailures(["get /x field"]).length,
    1,
  );

  assert(
    "an empty stale list produces no failure — the baseline need not shrink when nothing is stale",
    staleFailures([]).length,
    0,
  );

  assert(
    "a DB column absent from both the OpenAPI spec and the frontend contract is reported",
    checkDbCoverage(
      ["id", "title", "budget", "orgId"],
      new Set(["id", "title"]),
      new Set(["id", "title"]),
      new Set(["orgId"]),
    ),
    ["budget"],
  );

  assert(
    "a column in the private allowlist is not reported — the gate never forces internal columns into public responses",
    checkDbCoverage(
      ["id", "orgId"],
      new Set(["id"]),
      new Set(["id"]),
      new Set(["orgId"]),
    ),
    [],
  );

  assert(
    "a column already declared in either contract is not reported as absent",
    checkDbCoverage(
      ["id", "title"],
      new Set(["id"]),
      new Set(["id", "title"]),
      new Set(),
    ),
    [],
  );

  assert(
    "SEEDED VIOLATION — a baseline write that adds an entry is refused, so --update-baseline cannot capture new debt",
    baselineAdditions(
      { missing: ["a"], extras: [], typeMismatches: [], dbCoverage: [] },
      { missing: ["a", "b"], extras: [], typeMismatches: [], dbCoverage: [] },
    ),
    [{ bucket: "missing", keys: ["b"] }],
  );

  assert(
    "SEEDED VIOLATION — an addition in any bucket is caught, not only in missing",
    baselineAdditions(
      { missing: [], extras: [], typeMismatches: [], dbCoverage: ["x"] },
      { missing: [], extras: ["e"], typeMismatches: ["t"], dbCoverage: ["x", "y"] },
    ),
    [
      { bucket: "extras", keys: ["e"] },
      { bucket: "typeMismatches", keys: ["t"] },
      { bucket: "dbCoverage", keys: ["y"] },
    ],
  );

  assert(
    "VIOLATION REMOVED — a write that only prunes is permitted",
    baselineAdditions(
      { missing: ["a", "b"], extras: [], typeMismatches: [], dbCoverage: [] },
      { missing: ["a"], extras: [], typeMismatches: [], dbCoverage: [] },
    ),
    [],
  );

  assert(
    "an identical write is permitted, so a no-op prune is not mistaken for growth",
    baselineAdditions(
      { missing: ["a"], extras: [], typeMismatches: [], dbCoverage: [] },
      { missing: ["a"], extras: [], typeMismatches: [], dbCoverage: [] },
    ),
    [],
  );

  for (const check of checks)
    console.log(
      `${check.ok ? "ok  " : "FAIL"}  ${check.label}${check.ok ? "" : `\n        expected ${JSON.stringify(check.expected)}\n        actual   ${JSON.stringify(check.actual)}`}`,
    );
  const failed = checks.filter((check) => !check.ok).length;
  console.log(`\n${checks.length - failed}/${checks.length} self-test assertions passed.`);
  return failed === 0 ? 0 : 1;
}
