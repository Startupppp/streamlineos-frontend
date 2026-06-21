import { defineAbilityFor } from "../lib/abilities";

interface TestCase {
  name: string;
  ability: ReturnType<typeof defineAbilityFor>;
  expected: Array<{ verb: string; subject: string; want: boolean }>;
}

const PLATFORM_ADMIN = defineAbilityFor({
  isPlatformAdmin: true,
  isOrgOwner: false,
  permissions: [],
  enabledModules: [],
});

const ORG_OWNER = defineAbilityFor({
  isPlatformAdmin: false,
  isOrgOwner: true,
  permissions: [],
  enabledModules: ["hr", "crm", "projects"],
});

const HR_USER_PRO_PLAN = defineAbilityFor({
  isPlatformAdmin: false,
  isOrgOwner: false,
  permissions: [
    "hr:employees:view",
    "hr:employees:create",
    "hr:employees:update",
    "hr:leaves:view",
    "hr:leaves:approve",
    "hr:expenses:view",
    "hr:expenses:approve",
    "crm:leads:view",
  ],
  enabledModules: ["hr", "crm", "self", "dashboard"],
});

const HR_USER_HR_ONLY_PLAN = defineAbilityFor({
  isPlatformAdmin: false,
  isOrgOwner: false,
  permissions: [
    "hr:employees:view",
    "hr:employees:create",
    "hr:leaves:approve",
    "crm:leads:view",
    "crm:leads:create",
  ],
  enabledModules: ["hr", "self", "dashboard"],
});

const NO_PERMS_USER = defineAbilityFor({
  isPlatformAdmin: false,
  isOrgOwner: false,
  permissions: [],
  enabledModules: ["hr", "crm"],
});

const ACCOUNTANT_PRO_PLAN = defineAbilityFor({
  isPlatformAdmin: false,
  isOrgOwner: false,
  permissions: [
    "accounting:accounts:read",
    "accounting:accounts:create",
    "accounting:journal:read",
    "accounting:reports:read",
  ],
  enabledModules: ["self", "dashboard", "accounting"],
});

const ACCOUNTANT_ACCOUNTING_DISABLED = defineAbilityFor({
  isPlatformAdmin: false,
  isOrgOwner: false,
  permissions: [
    "accounting:accounts:read",
    "accounting:journal:read",
  ],
  enabledModules: ["self", "dashboard", "hr"],
});

const TESTS: TestCase[] = [
  {
    name: "Platform admin — should manage everything",
    ability: PLATFORM_ADMIN,
    expected: [
      { verb: "manage", subject: "all", want: true },
      { verb: "approve", subject: "hr:expenses", want: true },
      { verb: "manage", subject: "settings", want: true },
      { verb: "view", subject: "crm:leads", want: true },
      { verb: "manage", subject: "accounting:ledger", want: true },
    ],
  },
  {
    name: "Org owner — should manage everything within org",
    ability: ORG_OWNER,
    expected: [
      { verb: "manage", subject: "all", want: true },
      { verb: "approve", subject: "hr:expenses", want: true },
      { verb: "manage", subject: "settings", want: true },
      { verb: "manage", subject: "hr:employees", want: true },
    ],
  },
  {
    name: "HR user on PROFESSIONAL plan (HR + CRM enabled)",
    ability: HR_USER_PRO_PLAN,
    expected: [
      { verb: "manage", subject: "all", want: false },
      { verb: "view", subject: "hr:employees", want: true },
      { verb: "create", subject: "hr:employees", want: true },
      { verb: "approve", subject: "hr:leaves", want: true },
      { verb: "approve", subject: "hr:expenses", want: true },
      { verb: "view", subject: "crm:leads", want: true },
      { verb: "create", subject: "crm:leads", want: false },
      { verb: "manage", subject: "settings", want: false },
    ],
  },
  {
    name: "HR user on HR-ONLY plan — CRM perms should be dropped",
    ability: HR_USER_HR_ONLY_PLAN,
    expected: [
      { verb: "view", subject: "hr:employees", want: true },
      { verb: "approve", subject: "hr:leaves", want: true },
      { verb: "view", subject: "crm:leads", want: false },
      { verb: "create", subject: "crm:leads", want: false },
    ],
  },
  {
    name: "User with no permissions — should have no access",
    ability: NO_PERMS_USER,
    expected: [
      { verb: "manage", subject: "all", want: false },
      { verb: "view", subject: "hr:employees", want: false },
      { verb: "approve", subject: "hr:leaves", want: false },
      { verb: "view", subject: "crm:leads", want: false },
    ],
  },
  {
    name: "Accountant on PRO plan — accounting perms should resolve",
    ability: ACCOUNTANT_PRO_PLAN,
    expected: [
      { verb: "read", subject: "accounting:accounts", want: true },
      { verb: "create", subject: "accounting:accounts", want: true },
      { verb: "read", subject: "accounting:journal", want: true },
      { verb: "read", subject: "accounting:reports", want: true },
      { verb: "read", subject: "hr:employees", want: false },
    ],
  },
  {
    name: "Accountant on plan WITHOUT accounting module — accounting perms dropped",
    ability: ACCOUNTANT_ACCOUNTING_DISABLED,
    expected: [
      { verb: "read", subject: "accounting:accounts", want: false },
      { verb: "read", subject: "accounting:journal", want: false },
      { verb: "manage", subject: "all", want: false },
    ],
  },
];

let pass = 0;
let fail = 0;
const failures: string[] = [];

for (const t of TESTS) {
  console.log(`\n=== ${t.name} ===`);
  for (const ex of t.expected) {
    const got = t.ability.can(ex.verb, ex.subject);
    const ok = got === ex.want;
    const tick = ok ? "✓" : "✗";
    console.log(
      `  ${tick} ability.can("${ex.verb}", "${ex.subject}") = ${got} (want ${ex.want})`,
    );
    if (ok) pass++;
    else {
      fail++;
      failures.push(
        `${t.name}: can("${ex.verb}", "${ex.subject}") = ${got}, want ${ex.want}`,
      );
    }
  }
}

console.log(`\n=== TOTAL: ${pass} pass, ${fail} fail ===`);

if (fail > 0) {
  console.log("\nFAILURES:");
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}

process.exit(0);
