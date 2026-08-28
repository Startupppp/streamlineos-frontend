import {
  checkEnumDrift,
  checkExtraBodyFields,
  checkMethodMismatch,
  checkMissingPath,
  checkMissingRequiredFields,
  checkResolutionFloor,
  runChecks,
} from "./rules.mjs";
import { applyBaseline, printBaseline } from "./known-drift.mjs";

const CONTRACT = {
  paths: {
    "/timesheets/entries": {
      get: {},
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
    bodyFields: new Set(["date", "hours"]),
    bodyTypeName: null,
    isPartial: false,
    file: "<self-test>",
    ...overrides,
  };
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

  const r1 = checkMissingPath(
    call({ path: "/timesheets/nonexistent-endpoint", bodyFields: new Set(["date"]) }),
    CONTRACT,
  );
  assert("rule 1 fires: path absent from contract", r1 !== null);

  const r2 = checkMethodMismatch(call({ method: "PUT" }), CONTRACT);
  assert("rule 2 fires: method mismatch on known path", r2 !== null);

  const r3 = checkExtraBodyFields(
    call({ bodyFields: new Set(["date", "hours", "unknownField"]) }),
    CONTRACT,
  );
  assert("rule 3 fires: body field not in contract schema properties", r3 !== null && r3.includes("unknownField"));

  const r4 = checkMissingRequiredFields(call({ bodyFields: new Set(["date"]) }), CONTRACT);
  assert("rule 4 fires: required field absent from frontend body", r4 !== null && r4.includes("hours"));

  const feTypeAliasMap = new Map([["BillingType", ["BILLABLE", "NON_BILLABLE", "INTERNAL"]]]);
  const feFieldTypeMap = new Map([["CreateEntryInput", new Map([["billingType", "BillingType"]])]]);

  const enumDriftCall = call({
    bodyFields: new Set(["date", "hours", "billingType"]),
    bodyTypeName: "CreateEntryInput",
  });

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
    call({ bodyFields: new Set(["billingType"]), bodyTypeName: "CreateEntryInput", isPartial: true }),
    CONTRACT,
  );
  assert("Partial<T> body: missing required fields are not flagged when isPartial is true", r6 === null);

  const allNullCalls = Array.from({ length: 10 }, () => call({ bodyFields: null }));
  const r7 = checkResolutionFloor(allNullCalls, 0.3, 1);
  assert("resolution floor fires when all bodies are unresolved", r7 !== null);

  const halfResolvedCalls = allNullCalls.map((c, i) =>
    i < 4 ? { ...c, bodyFields: new Set(["date"]) } : c,
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

  console.log(`\n  ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.error("\n✖  self-test failed");
    process.exit(1);
  }

  console.log("\n✔  self-test passed — all eighteen cases wired and fire");
  process.exit(0);
}
