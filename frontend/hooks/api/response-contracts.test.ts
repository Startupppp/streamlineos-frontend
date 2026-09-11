import { accessResponseContract } from "@/hooks/api/access-schema";
import { entitlementsContract } from "@/hooks/api/entitlements-schema";
import {
  aiCreditsUsageContract,
  aiCreditsWalletContract,
  aiCreditTransactionsPageContract,
} from "@/hooks/api/ai-credits-schema";
import {
  organizationPersonContract,
  peoplePageContract,
} from "@/hooks/api/directory/people-schema";
import { orgDisplayContract } from "@/hooks/api/org-display-schema";
import {
  essBankDetailsContract,
  essPayslipsContract,
} from "@/hooks/api/payroll/ess-schema";
import { moduleMyPermissionsContract } from "@/hooks/api/module-access/module-access-schema";

import {
  ACCESS,
  ENTITLEMENTS,
  LEDGER_ROW,
  PERSON,
  USAGE,
  WALLET,
} from "@/test-utils/response-contract-fixtures";

/**
 * Two halves, and both are load-bearing.
 *
 * A contract that rejects real traffic is worse than no contract — it turns a
 * working screen into an error page on deploy, which is why the fixtures are
 * the shapes the backend services actually build.
 *
 * The second half feeds each contract the specific drift it exists to catch:
 * the renamed field, the removed one, the number that is really a string.
 */

describe("the shipped contracts accept the response the backend actually builds", () => {
  it("accepts an access snapshot", () => {
    expect(accessResponseContract.safeParse(ACCESS).success).toBe(true);
  });

  it("accepts an access snapshot from a version that omits mfa and version", () => {
    const { mfa: _mfa, version: _version, ...older } = ACCESS;
    expect(accessResponseContract.safeParse(older).success).toBe(true);
  });

  it("accepts an entitlements payload including the two HR limits", () => {
    expect(entitlementsContract.safeParse(ENTITLEMENTS).success).toBe(true);
  });

  it("accepts a wallet whose costUsd is the numeric string Postgres returns", () => {
    expect(aiCreditsWalletContract.safeParse(WALLET).success).toBe(true);
  });

  it("accepts a keyset ledger page", () => {
    const page = {
      data: [LEDGER_ROW],
      pagination: { limit: 20, nextCursor: "eyJpZCI6OTF9", hasMore: true },
    };
    expect(aiCreditTransactionsPageContract.safeParse(page).success).toBe(true);
  });

  it("accepts the usage rollup, where costUsd is a real number", () => {
    expect(aiCreditsUsageContract.safeParse(USAGE).success).toBe(true);
  });

  it("accepts a person in each of the three account states", () => {
    const invited = {
      ...PERSON,
      accountAccess: {
        state: "INVITED",
        invitationId: "inv-1",
        invitationStatus: "PENDING",
        email: "new@example.test",
        role: "MEMBER",
        expiresAt: "2026-09-01T00:00:00.000Z",
      },
    };
    for (const person of [PERSON, invited, { ...PERSON, accountAccess: { state: "NONE" } }])
      expect(organizationPersonContract.safeParse(person).success).toBe(true);
  });

  it("accepts a people page", () => {
    const page = { data: [PERSON], pageInfo: { limit: 20, hasMore: false, nextCursor: null } };
    expect(peoplePageContract.safeParse(page).success).toBe(true);
  });

  it("accepts the org display payload", () => {
    expect(orgDisplayContract.safeParse({ currency: "INR", locale: "en-IN" }).success).toBe(true);
  });

  it("accepts payslips whose net is the decimal string Postgres returns", () => {
    const payslips = [
      {
        publicationId: 3,
        month: "2026-07",
        net: "84250.00",
        publishedAt: "2026-07-31T00:00:00.000Z",
        downloadHref: "/payroll/me/payslips/3",
      },
    ];
    expect(essPayslipsContract.safeParse(payslips).success).toBe(true);
  });

  it("accepts both arms of the masked bank union", () => {
    expect(essBankDetailsContract.safeParse({ hasBank: false, masked: null }).success).toBe(true);
    expect(
      essBankDetailsContract.safeParse({
        hasBank: true,
        masked: {
          accountNumber: "****4321",
          bankName: "HDFC",
          branch: "Indiranagar",
          ifsc: "HDFC0001234",
          accountHolder: "Asha Rao",
          bankCountry: null,
        },
      }).success,
    ).toBe(true);
  });

  it("accepts a module permission snapshot", () => {
    const snapshot = {
      permissions: [{ key: "hr:employees:view", scope: "all" }],
      isOrgOwner: false,
      isOrgAdmin: false,
      isModuleOwner: true,
      isModuleAdmin: true,
    };
    expect(moduleMyPermissionsContract.safeParse(snapshot).success).toBe(true);
  });
});

describe("the shipped contracts reject the drift they exist for", () => {
  it("rejects an access snapshot whose scopes map was renamed", () => {
    const { scopes: _scopes, ...renamed } = ACCESS;
    expect(
      accessResponseContract.safeParse({ ...renamed, permissions: {} }).success,
    ).toBe(false);
  });

  it("rejects a scope value that left the enum", () => {
    const widened = { ...ACCESS, scopes: { "hr:employees:view": "everything" } };
    expect(accessResponseContract.safeParse(widened).success).toBe(false);
  });

  it("rejects an access snapshot that dropped isOrgOwner", () => {
    const { isOrgOwner: _isOrgOwner, ...dropped } = ACCESS;
    expect(accessResponseContract.safeParse(dropped).success).toBe(false);
  });

  it("rejects entitlements that stopped sending a limit", () => {
    const { members: _members, ...limits } = ENTITLEMENTS.limits;
    expect(
      entitlementsContract.safeParse({ ...ENTITLEMENTS, limits }).success,
    ).toBe(false);
  });

  it("rejects a plan value outside the catalog", () => {
    expect(
      entitlementsContract.safeParse({ ...ENTITLEMENTS, plan: "TEAM" }).success,
    ).toBe(false);
  });

  it("rejects a wallet balance that arrived as a string", () => {
    const drifted = { ...WALLET, wallet: { ...WALLET.wallet, balance: "998.75" } };
    expect(aiCreditsWalletContract.safeParse(drifted).success).toBe(false);
  });

  it("rejects a ledger costUsd that arrived as a number", () => {
    const drifted = { ...WALLET, recentTransactions: [{ ...LEDGER_ROW, costUsd: 0.0042 }] };
    expect(aiCreditsWalletContract.safeParse(drifted).success).toBe(false);
  });

  it("rejects a usage costUsd that arrived as a string", () => {
    const drifted = { ...USAGE, totals: { ...USAGE.totals, costUsd: "0.0042" } };
    expect(aiCreditsUsageContract.safeParse(drifted).success).toBe(false);
  });

  it("rejects a ledger page whose cursor field was renamed", () => {
    const drifted = {
      data: [LEDGER_ROW],
      pagination: { limit: 20, cursor: "x", hasMore: true },
    };
    expect(aiCreditTransactionsPageContract.safeParse(drifted).success).toBe(false);
  });

  it("rejects a person whose accountAccess stopped being attached", () => {
    const { accountAccess: _accountAccess, ...dropped } = PERSON;
    expect(organizationPersonContract.safeParse(dropped).success).toBe(false);
  });

  it("rejects an invitation arm missing its expiry", () => {
    const drifted = {
      ...PERSON,
      accountAccess: {
        state: "INVITED",
        invitationId: "inv-1",
        invitationStatus: "PENDING",
        email: "new@example.test",
        role: "MEMBER",
      },
    };
    expect(organizationPersonContract.safeParse(drifted).success).toBe(false);
  });

  it("rejects a people page that became a bare array", () => {
    expect(peoplePageContract.safeParse([PERSON]).success).toBe(false);
  });

  it("rejects an org display payload missing its currency", () => {
    expect(orgDisplayContract.safeParse({ locale: "en-IN" }).success).toBe(false);
  });

  it("rejects a payslip net that arrived as a number", () => {
    const drifted = [
      {
        publicationId: 3,
        month: "2026-07",
        net: 84250,
        publishedAt: null,
        downloadHref: "/x",
      },
    ];
    expect(essPayslipsContract.safeParse(drifted).success).toBe(false);
  });

  it("rejects a bank read claiming an account with no masked detail", () => {
    expect(essBankDetailsContract.safeParse({ hasBank: true, masked: null }).success).toBe(
      false,
    );
  });

  it("rejects an unmasked account number field name change", () => {
    const drifted = {
      hasBank: true,
      masked: {
        account: "****4321",
        bankName: "HDFC",
        branch: "Indiranagar",
        ifsc: "HDFC0001234",
        accountHolder: "Asha Rao",
        bankCountry: null,
      },
    };
    expect(essBankDetailsContract.safeParse(drifted).success).toBe(false);
  });

  it("rejects a module snapshot that dropped isModuleOwner", () => {
    const drifted = {
      permissions: [],
      isOrgOwner: false,
      isOrgAdmin: false,
      isModuleAdmin: false,
    };
    expect(moduleMyPermissionsContract.safeParse(drifted).success).toBe(false);
  });
});
