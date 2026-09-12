import {
  checkEnumDrift,
  checkExtraBodyFields,
  checkMethodMismatch,
  checkMissingPath,
  checkMissingRequiredFields,
  checkResolutionFloor,
  checkSkippedComputedPaths,
  runChecks,
} from "./rules.mjs";
import { applyBaseline, printBaseline } from "./known-drift.mjs";
import { extractCallsFromSource } from "./frontend-calls.mjs";

const CONTRACT = {
  paths: {
    "/timesheets/entries": {
      get: {
        parameters: [
          { name: "userId", in: "query", required: false, schema: { type: "string" } },
          { name: "status", in: "query", required: false, schema: { type: "string", enum: ["PENDING", "APPROVED"] } },
          { name: "startDate", in: "query", required: true, schema: { type: "string" } },
        ],
      },
      post: {
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["date", "hours"],
                properties: {
                  date: { type: "string" },
                  hours: { type: "number" },
                  billingType: { type: "string", enum: ["BILLABLE", "NON_BILLABLE", "FIXED"] },
                },
              },
            },
          },
        },
      },
    },
  },
};

function call(overrides) {
  return {
    method: "POST",
    path: "/timesheets/entries",
    requestFields: new Set(["date", "hours"]),
    requestTypeName: null,
    requestKind: "body",
    isPartial: false,
    file: "<self-test>",
    ...overrides,
  };
}

function queryCall(overrides) {
  return call({
    method: "GET",
    requestKind: "query",
    requestFields: new Set(["startDate"]),
    ...overrides,
  });
}

export function runSelfTest() {
  let passed = 0;
  let failed = 0;

  function assert(label, condition) {
    if (condition) {
      console.log(`  pass  ${label}`);
      passed++;
    } else {
      console.error(`  FAIL  ${label}`);
      failed++;
    }
  }

  const emptyMaps = [new Map(), new Map()];

  const { violations: matchingViolations } = runChecks([call({})], CONTRACT, ...emptyMaps);
  assert("matching pair produces no violations", matchingViolations.length === 0);

  const { violations: matchingQueryViolations } = runChecks([queryCall({})], CONTRACT, ...emptyMaps);
  assert("matching GET query params produce no violations", matchingQueryViolations.length === 0);

  const r1 = checkMissingPath(
    call({ path: "/timesheets/nonexistent-endpoint", requestFields: new Set(["date"]) }),
    CONTRACT,
  );
  assert("rule 1 fires: path absent from contract", r1 !== null);

  const r2 = checkMethodMismatch(call({ method: "PUT" }), CONTRACT);
  assert("rule 2 fires: method mismatch on known path", r2 !== null);

  const r3 = checkExtraBodyFields(
    call({ requestFields: new Set(["date", "hours", "unknownField"]) }),
    CONTRACT,
  );
  assert("rule 3 fires: body field not in contract schema properties", r3 !== null && r3.includes("unknownField"));

  const r4 = checkMissingRequiredFields(call({ requestFields: new Set(["date"]) }), CONTRACT);
  assert("rule 4 fires: required field absent from frontend body", r4 !== null && r4.includes("hours"));

  // A GET's query string is half of its request contract. Skipping it is what
  // left 23 of the 48 calls unreadable while the gate reported a pass.
  const r3q = checkExtraBodyFields(
    queryCall({ requestFields: new Set(["startDate", "teamId"]) }),
    CONTRACT,
  );
  assert(
    "rule 3 fires on a query param the contract does not declare",
    r3q !== null && r3q.includes("teamId") && r3q.includes("query params"),
  );

  const r4q = checkMissingRequiredFields(queryCall({ requestFields: new Set(["userId"]) }), CONTRACT);
  assert(
    "rule 4 fires on a required query param the frontend never sends",
    r4q !== null && r4q.includes("startDate"),
  );

  const feTypeAliasMap = new Map([["BillingType", ["BILLABLE", "NON_BILLABLE", "INTERNAL"]]]);
  const feFieldTypeMap = new Map([["CreateEntryInput", new Map([["billingType", "BillingType"]])]]);

  const enumDriftCall = call({
    requestFields: new Set(["date", "hours", "billingType"]),
    requestTypeName: "CreateEntryInput",
  });

  const { violation: r5q } = checkEnumDrift(
    queryCall({ requestFields: new Set(["startDate", "status"]), requestTypeName: "EntriesQueryParams" }),
    CONTRACT,
    new Map([["EntriesQueryParams", new Map([["status", "EntryStatus"]])]]),
    new Map([["EntryStatus", ["PENDING", "APPROVED", "REJECTED"]]]),
  );
  assert(
    "rule 5 fires on a query param enum the contract does not accept",
    r5q !== null && r5q.includes("REJECTED"),
  );

  const { violation: r5 } = checkEnumDrift(enumDriftCall, CONTRACT, feFieldTypeMap, feTypeAliasMap);
  assert(
    "rule 5 fires: enum member INTERNAL sent by frontend not in contract enum",
    r5 !== null && r5.includes("INTERNAL"),
  );

  const feNarrowAliasMap = new Map([["BillingType", ["BILLABLE"]]]);
  const { violation: r5b, narrowing: r5n } = checkEnumDrift(
    enumDriftCall,
    CONTRACT,
    feFieldTypeMap,
    feNarrowAliasMap,
  );
  assert("narrowing: frontend sending a subset of contract does not fire a violation", r5b === null);
  assert("narrowing: frontend sending a subset of contract reports a narrowing", r5n !== null);

  const r6 = checkMissingRequiredFields(
    call({ requestFields: new Set(["billingType"]), requestTypeName: "CreateEntryInput", isPartial: true }),
    CONTRACT,
  );
  assert("Partial<T> body: missing required fields are not flagged when isPartial is true", r6 === null);

  const allNullCalls = Array.from({ length: 10 }, () => call({ requestFields: null }));
  const r7 = checkResolutionFloor(allNullCalls, 0.3, 1);
  assert("resolution floor fires when all bodies are unresolved", r7 !== null);

  const halfResolvedCalls = allNullCalls.map((c, i) =>
    i < 4 ? { ...c, requestFields: new Set(["date"]) } : c,
  );
  const r7b = checkResolutionFloor(halfResolvedCalls, 0.3, 1);
  assert("resolution floor does not fire when resolved fraction meets the minimum", r7b === null);

  // The vacuous pass: `walkTs` swallows a missing directory, so a moved hook
  // folder yields zero calls, zero violations and a green tick. Without this
  // floor the checker reports success while having checked nothing.
  const r7c = checkResolutionFloor([], 0.3, 20);
  assert("scan floor fires when the extractor finds no calls at all", r7c !== null);

  const r7d = checkResolutionFloor(halfResolvedCalls, 0.3, 20);
  assert("scan floor fires when the extractor finds too few calls to be trusted", r7d !== null);

  // A skipped call is worse than an unresolved one: it leaves the report
  // entirely, so its drift can never surface. Counting it is not enough.
  assert("computed-path rule fires when a call is skipped for an interpolated segment", checkSkippedComputedPaths(1) !== null);
  assert("computed-path rule stays silent when every path is literal", checkSkippedComputedPaths(0) === null);

  const testBaseline = [
    {
      type: "enum",
      method: "POST",
      path: "/timesheets/entries",
      field: "billingType",
      offendingMembers: ["INTERNAL"],
      contractEnum: ["BILLABLE", "NON_BILLABLE", "FIXED"],
      since: "2026-08-28",
      reason: "test baseline entry",
    },
  ];

  const baselinedViol = "enum member drift on POST /timesheets/entries — billingType: frontend can send [INTERNAL] but contract enum is [BILLABLE, NON_BILLABLE, FIXED]";
  const { newViolations: r8new, baselinedViolations: r8base } = applyBaseline([baselinedViol], testBaseline);
  assert("baselined violation is not in newViolations", r8new.length === 0);
  assert("baselined violation is captured in baselinedViolations", r8base.length === 1);

  const combinedViol = "enum member drift on POST /timesheets/entries — billingType: frontend can send [INTERNAL] but contract enum is [BILLABLE, NON_BILLABLE, FIXED]; extraField: frontend can send [SOMETHING] but contract enum is [OTHER]";
  const { newViolations: r9new } = applyBaseline([combinedViol], testBaseline);
  assert("non-baselined field on same endpoint still produces a new violation", r9new.length === 1);

  const { staleEntries: r10stale } = applyBaseline([], testBaseline);
  assert("stale baseline entry detected when no matching violation exists", r10stale.length === 1);

  let r11threw = false;
  try { printBaseline([]); } catch { r11threw = true; }
  assert("printBaseline runs without throwing even with an empty baseline", !r11threw);

  const extractorMap = new Map([
    ["CreateEntryInput", new Set(["date", "hours"])],
    ["EntriesQueryParams", new Set(["userId", "startDate"])],
    ["BillingNarrativeInput", new Set(["projectId", "startDate", "endDate"])],
  ]);
  const extract = (src) => extractCallsFromSource(src, extractorMap, "<self-test>").calls;

  // The body is argument 1 and the response contract comes after it. Anchoring
  // on the closing paren silently unresolved every inline-object body the day
  // that argument was added.
  const inlineAfterContract = extract(
    "    mutationFn: ({ periodId, reason }: { periodId: number; reason: string }) =>\n" +
      "      apiClient.post<TimesheetPeriod>(`/timesheets/approvals/${periodId}/reject`, { reason }, undefined, timesheetPeriodC),\n",
  );
  assert(
    "inline object body resolves when a config and contract argument follow it",
    inlineAfterContract.length === 1 && inlineAfterContract[0].requestFields?.has("reason") === true,
  );

  const namedAfterContract = extract(
    "    mutationFn: (data: CreateEntryInput) =>\n" +
      '      apiClient.post<TimesheetEntry>(\n        "/timesheets/entries",\n        data,\n        undefined,\n        entryC,\n      ),\n',
  );
  assert(
    "named body type resolves across a trailing-comma argument list",
    namedAfterContract.length === 1 &&
      namedAfterContract[0].requestTypeName === "CreateEntryInput" &&
      namedAfterContract[0].requestFields?.has("hours") === true,
  );

  const inlineParam = extract(
    "    mutationFn: (range: { start: string; end: string }) =>\n" +
      '      apiClient.post<AttendanceDraftResult>("/timesheets/entries/from-attendance", range),\n',
  );
  assert(
    "inline object parameter resolves as a request shape",
    inlineParam.length === 1 &&
      inlineParam[0].requestFields?.has("start") === true &&
      inlineParam[0].requestFields?.has("end") === true,
  );

  const constParams = extract(
    "    const params = { userId: input.userId, page: input.page ?? 1, limit: 25 };\n" +
      '    apiClient.get<OverdueQueueResult>("/timesheets/periods/overdue", params),\n',
  );
  assert(
    "const object params resolve as a request shape",
    constParams.length === 1 &&
      constParams[0].requestFields?.has("userId") === true &&
      constParams[0].requestFields?.has("limit") === true,
  );

  const nestedGeneric = extract(
    '      return apiClient.get<CursorPage<TimesheetEntry>>("/timesheets/entries", params, signal, entriesListC);\n',
  );
  assert(
    "a nested generic type argument does not hide the call from the scan",
    nestedGeneric.length === 1 && nestedGeneric[0].path === "/timesheets/entries",
  );

  // An omitted payload is a KNOWN payload — the empty one. Reporting it as
  // unresolved skipped the required-field rule on every bodyless POST, so an
  // endpoint that grew a required field would have drifted silently.
  const undefinedBody = extract(
    "    mutationFn: (periodId: number) =>\n" +
      "      apiClient.post<TimesheetPeriod>(`/timesheets/approvals/${periodId}/approve`, undefined, undefined, timesheetPeriodC),\n",
  );
  assert(
    "an explicit undefined body resolves to the empty request shape",
    undefinedBody.length === 1 && undefinedBody[0].requestFields?.size === 0,
  );
  assert(
    "the required-field rule reaches a call that sends no body at all",
    checkMissingRequiredFields({ ...undefinedBody[0], path: "/timesheets/entries", method: "POST" }, CONTRACT) !== null,
  );

  const getParams = extract(
    "    const params: EntriesQueryParams = toParams(query);\n" +
      '    queryFn: ({ signal }) => apiClient.get<CursorPage<TimesheetEntry>>("/timesheets/entries", params, signal, entriesListC),\n',
  );
  assert(
    "GET query params resolve as the request shape, tagged as query not body",
    getParams.length === 1 &&
      getParams[0].requestKind === "query" &&
      getParams[0].requestTypeName === "EntriesQueryParams" &&
      getParams[0].requestFields?.has("startDate") === true,
  );

  const untypedGetParams = extract(
    "    const params: Record<string, unknown> = { ...filters };\n" +
      '    queryFn: ({ signal }) => apiClient.get<CursorPage<TimesheetEntry>>("/timesheets/entries", params, signal, entriesListC),\n',
  );
  assert(
    "a Record<string, unknown> params bag stays unresolved rather than reporting nothing",
    untypedGetParams.length === 1 && untypedGetParams[0].requestFields === null,
  );

  const spreadBody = extract(
    '      apiClient.post<TimesheetEntry>("/timesheets/entries", { ...draft, hours }, undefined, entryC),\n',
  );
  assert(
    "a spread body stays unresolved rather than reporting a partial field set",
    spreadBody.length === 1 && spreadBody[0].requestFields === null,
  );

  const computedSegment = extractCallsFromSource(
    "      apiClient.post<TimerSession>(`/timesheets/timer/${timerId}/${action}`, undefined, undefined, timerC),\n",
    extractorMap,
    "<self-test>",
  );
  assert(
    "a path segment interpolated from a variable is reported as skipped, not scanned",
    computedSegment.calls.length === 0 && computedSegment.skipped === 1,
  );

  // These post through `streamAiResult`, not `apiClient`; scanning only
  // `apiClient` left five timesheets AI request bodies outside the report.
  const streamNamedBody = extract(
    "export async function generateBillingNarrative(\n  input: BillingNarrativeInput,\n  options?: AiResultStreamOptions,\n) {\n" +
      '  return streamAiResult({ path: "/timesheets/ai/billing-narrative/stream", body: input, schema: timesheetDraftSchema, ...options });\n}\n',
  );
  assert(
    "a streamAiResult call is extracted as a POST with its typed body",
    streamNamedBody.length === 1 &&
      streamNamedBody[0].method === "POST" &&
      streamNamedBody[0].path === "/timesheets/ai/billing-narrative/stream" &&
      streamNamedBody[0].requestTypeName === "BillingNarrativeInput" &&
      streamNamedBody[0].requestFields?.has("endDate") === true,
  );

  const streamNoBody = extract(
    "  return streamAiResult({ path: `/timesheets/periods/${periodId}/ai/summarize/stream`, schema: timesheetSummarySchema, ...options });\n",
  );
  assert(
    "a streamAiResult call with no body key resolves to the empty request shape",
    streamNoBody.length === 1 && streamNoBody[0].requestFields?.size === 0,
  );

  console.log(`\n  ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.error("\n✖  self-test failed");
    process.exit(1);
  }

  console.log(`\n✔  self-test passed — all ${passed} cases wired and fire`);
  process.exit(0);
}
