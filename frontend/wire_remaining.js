// wire_remaining.js — wires contracts into remaining hook/prefetch/component files
const fs = require("fs");

function patch(filePath, fn) {
  let src = fs.readFileSync(filePath, "utf8");
  const next = fn(src);
  if (next !== src) {
    fs.writeFileSync(filePath, next, "utf8");
    console.log("wired", filePath.split(/[/\\]/).slice(-3).join("/"));
  } else {
    console.log("skipped (no change)", filePath.split(/[/\\]/).slice(-3).join("/"));
  }
}

const FE = "D:/projects/personal/Streamlineos/frontend";

// ── auth-hooks.ts ────────────────────────────────────────────────────────────
patch(`${FE}/hooks/common/auth-hooks.ts`, (src) => {
  // Add lazy contracts after existing ones (after switchOrgContract)
  const insert = `const verifyEmailContract = lazyContract(() =>
  import("@/hooks/common/auth-schema").then((m) => m.verifyEmailContract),
);
const invitationValidateContract = lazyContract(() =>
  import("@/hooks/common/auth-schema").then((m) => m.invitationValidateContract),
);
const acceptInvitationContract = lazyContract(() =>
  import("@/hooks/common/auth-schema").then((m) => m.acceptInvitationContract),
);
const declineInvitationContract = lazyContract(() =>
  import("@/hooks/common/auth-schema").then((m) => m.declineInvitationContract),
);
const resendVerificationContract = lazyContract(() =>
  import("@/hooks/common/auth-schema").then((m) => m.resendVerificationContract),
);
const logoutContract = lazyContract(() =>
  import("@/hooks/common/auth-schema").then((m) => m.logoutContract),
);

`;
  src = src.replace(
    /const switchOrgContract = lazyContract[\s\S]+?\);\n\n/,
    (m) => m + insert,
  );

  // Wire verifyEmail
  src = src.replace(
    `apiClient.post<{ autoLoginToken: string }>(\n        "/auth/verify-email",\n        variables,\n      )`,
    `apiClient.post<{ autoLoginToken: string }>(\n        "/auth/verify-email",\n        variables,\n        undefined,\n        verifyEmailContract,\n      )`,
  );

  // Wire validateInvitation
  src = src.replace(
    `apiClient.get("/organization/invitations/validate", { token }, signal)`,
    `apiClient.get("/organization/invitations/validate", { token }, signal, invitationValidateContract)`,
  );

  // Fix acceptInvitation type (autoLoginToken required, add ok) + wire contract
  src = src.replace(
    `apiClient.post<{ autoLoginToken?: string }>(\n        "/organization/invitations/accept",\n        variables,\n      )`,
    `apiClient.post<{ ok: true; autoLoginToken: string }>(\n        "/organization/invitations/accept",\n        variables,\n        undefined,\n        acceptInvitationContract,\n      )`,
  );

  // Wire declineInvitation
  src = src.replace(
    `apiClient.post<{ ok: true }>(\n        "/organization/invitations/decline",\n        variables,\n      )`,
    `apiClient.post<{ ok: true }>(\n        "/organization/invitations/decline",\n        variables,\n        undefined,\n        declineInvitationContract,\n      )`,
  );

  // Fix resendVerification type + wire contract
  src = src.replace(
    `apiClient.post<{ success: boolean }>(\n        "/auth/resend-verification",\n        variables,\n      )`,
    `apiClient.post<{ message: string }>(\n        "/auth/resend-verification",\n        variables,\n        undefined,\n        resendVerificationContract,\n      )`,
  );

  // Wire logout (inside try block — just the post call)
  src = src.replace(
    `await apiClient.post("/auth/logout", undefined);`,
    `await apiClient.post("/auth/logout", undefined, undefined, logoutContract);`,
  );

  return src;
});

// ── use-push-subscription.ts ─────────────────────────────────────────────────
patch(`${FE}/hooks/common/use-push-subscription.ts`, (src) => {
  // Add lazyContract import after useMutation import line
  src = src.replace(
    `import { apiClient } from "@/lib/api-client";`,
    `import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";`,
  );

  // Add lazy contracts before OPT_OUT_KEY
  const lazyContracts = `const pushSubscribeContract = lazyContract(() =>
  import("@/hooks/common/push-schema").then((m) => m.pushSubscribeContract),
);
const pushUnsubscribeContract = lazyContract(() =>
  import("@/hooks/common/push-schema").then((m) => m.pushUnsubscribeContract),
);
const vapidPublicKeyContract = lazyContract(() =>
  import("@/hooks/common/push-schema").then((m) => m.vapidPublicKeyContract),
);

`;
  src = src.replace(
    `const OPT_OUT_KEY = "streamline.push.opted-out";`,
    lazyContracts + `const OPT_OUT_KEY = "streamline.push.opted-out";`,
  );

  // Wire subscribe mutation (registerPushSubscription)
  src = src.replace(
    `apiClient.post("/push/subscribe", {\n        endpoint,\n        p256dh,\n        auth,\n        userAgent: navigator.userAgent.slice(0, 255),\n      })`,
    `apiClient.post("/push/subscribe", {\n        endpoint,\n        p256dh,\n        auth,\n        userAgent: navigator.userAgent.slice(0, 255),\n      }, undefined, pushSubscribeContract)`,
  );

  // Wire subscribe() function inner call
  src = src.replace(
    `await apiClient.post("/push/subscribe", {\n    endpoint: sub.endpoint,\n    p256dh,\n    auth,\n    userAgent: navigator.userAgent.slice(0, 255),\n  });`,
    `await apiClient.post("/push/subscribe", {\n    endpoint: sub.endpoint,\n    p256dh,\n    auth,\n    userAgent: navigator.userAgent.slice(0, 255),\n  }, undefined, pushSubscribeContract);`,
  );

  // Wire unsubscribe
  src = src.replace(
    `await apiClient.delete(\n    \`/push/subscribe?endpoint=\${encodeURIComponent(endpoint)}\`,\n  );`,
    `await apiClient.delete(\n    \`/push/subscribe?endpoint=\${encodeURIComponent(endpoint)}\`,\n    undefined,\n    pushUnsubscribeContract,\n  );`,
  );

  // Wire vapid-public-key
  src = src.replace(
    `apiClient.get<{ key: string }>("/push/vapid-public-key")`,
    `apiClient.get<{ key: string }>("/push/vapid-public-key", undefined, undefined, vapidPublicKeyContract)`,
  );

  return src;
});

// ── executive-brief.ts ───────────────────────────────────────────────────────
patch(`${FE}/lib/api/hooks/executive-brief.ts`, (src) => {
  // Add lazyContract import
  src = src.replace(
    `import { queryOptions, useQueryClient } from "@tanstack/react-query";`,
    `import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { lazyContract } from "@/lib/api-envelope";`,
  );

  // Add lazy contract before briefQueryOptions
  src = src.replace(
    `const briefQueryOptions = queryOptions({`,
    `const executiveBriefContract = lazyContract(() =>
  import("@/lib/api/hooks/executive-brief-schema").then((m) => m.executiveBriefGetLatestContract),
);

const briefQueryOptions = queryOptions({`,
  );

  // Wire contract into queryFn
  src = src.replace(
    `queryFn: ({ signal }) => apiClient.get<LatestBriefResponse>("/ai/executive-brief", undefined, signal),`,
    `queryFn: ({ signal }) => apiClient.get<LatestBriefResponse>("/ai/executive-brief", undefined, signal, executiveBriefContract),`,
  );

  return src;
});

// ── onboarding.ts ────────────────────────────────────────────────────────────
patch(`${FE}/lib/api/hooks/onboarding.ts`, (src) => {
  // Add lazyContract import
  src = src.replace(
    `import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";`,
    `import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { lazyContract } from "@/lib/api-envelope";`,
  );

  // Add lazy contracts before first export
  src = src.replace(
    `export interface PersonalDetailsPayload {`,
    `const personalDetailsContract = lazyContract(() =>
  import("@/lib/api/hooks/onboarding-schema").then((m) => m.personalDetailsContract),
);
const bankDetailsContract = lazyContract(() =>
  import("@/lib/api/hooks/onboarding-schema").then((m) => m.bankDetailsContract),
);

export interface PersonalDetailsPayload {`,
  );

  // Wire personalDetails
  src = src.replace(
    `apiClient.get<PersonalDetails>("/onboarding/personal-details", undefined, signal)`,
    `apiClient.get<PersonalDetails>("/onboarding/personal-details", undefined, signal, personalDetailsContract)`,
  );

  // Wire bankDetails
  src = src.replace(
    `apiClient.get<BankDetails>("/onboarding/bank-details", undefined, signal)`,
    `apiClient.get<BankDetails>("/onboarding/bank-details", undefined, signal, bankDetailsContract)`,
  );

  return src;
});

// ── org.ts ───────────────────────────────────────────────────────────────────
patch(`${FE}/lib/api/hooks/org.ts`, (src) => {
  // Add lazyContract import
  src = src.replace(
    `import { useMutation, useQuery } from "@tanstack/react-query";`,
    `import { useMutation, useQuery } from "@tanstack/react-query";
import { lazyContract } from "@/lib/api-envelope";`,
  );

  // Add lazy contracts before first export
  src = src.replace(
    `export type OrgSetupPayload = {`,
    `const orgSetupSessionContract = lazyContract(() =>
  import("@/lib/api/hooks/org-schema").then((m) => m.orgSetupSessionContract),
);
const orgSetupCompleteContract = lazyContract(() =>
  import("@/lib/api/hooks/org-schema").then((m) => m.orgSetupCompleteContract),
);
const orgSetupSkipContract = lazyContract(() =>
  import("@/lib/api/hooks/org-schema").then((m) => m.orgSetupSkipContract),
);

export type OrgSetupPayload = {`,
  );

  // Wire session query
  src = src.replace(
    `apiClient.get<OrgSetupSession>("/org/setup/session", undefined, signal)`,
    `apiClient.get<OrgSetupSession>("/org/setup/session", undefined, signal, orgSetupSessionContract)`,
  );

  // Wire complete mutation
  src = src.replace(
    `apiClient.post<OrgSetupResponse>("/org/setup/complete", payload)`,
    `apiClient.post<OrgSetupResponse>("/org/setup/complete", payload, undefined, orgSetupCompleteContract)`,
  );

  // Wire skip mutation
  src = src.replace(
    `apiClient.post<OrgSetupResponse>("/org/setup/skip", payload)`,
    `apiClient.post<OrgSetupResponse>("/org/setup/skip", payload, undefined, orgSetupSkipContract)`,
  );

  return src;
});

// ── prefetch/build.ts ─────────────────────────────────────────────────────────
patch(`${FE}/lib/prefetch/build.ts`, (src) => {
  src = src.replace(
    `import { serverGet } from "@/lib/server-fetch";`,
    `import { serverGet } from "@/lib/server-fetch";
import type { ResponseContract } from "@/lib/api-envelope";`,
  );
  // Add lazy import inline (server files can't use lazyContract — it's a client-side defer)
  // Instead use a direct dynamic import at call-site via a contract variable
  // Actually, serverGet accepts ResponseContract which is a ZodType — we need to import the schema
  // For server-only files we can do a top-level dynamic import... but better to use direct import
  // since these are server-only files and not in the client bundle.
  // Revert: just import the schema directly (no lazyContract needed for server-only files)
  src = src.replace(
    `import type { ResponseContract } from "@/lib/api-envelope";`,
    ``,
  );
  src = src.replace(
    `import { serverGet } from "@/lib/server-fetch";`,
    `import { serverGet } from "@/lib/server-fetch";
import { projectDetailContract } from "@/lib/prefetch/prefetch-schema";`,
  );

  // Wire contract
  src = src.replace(
    `queryFn: () => serverGet<ProjectWithDetails>(\`/build/\${projectId}\`),`,
    `queryFn: () => serverGet<ProjectWithDetails>(\`/build/\${projectId}\`, projectDetailContract),`,
  );

  return src;
});

// ── prefetch/dashboard.ts ─────────────────────────────────────────────────────
patch(`${FE}/lib/prefetch/dashboard.ts`, (src) => {
  src = src.replace(
    `import { serverGet } from "@/lib/server-fetch";`,
    `import { serverGet } from "@/lib/server-fetch";
import { dashboardStatsContract } from "@/lib/prefetch/prefetch-schema";`,
  );

  src = src.replace(
    `queryFn: () => serverGet<DashboardStats>("/dashboard/stats"),`,
    `queryFn: () => serverGet<DashboardStats>("/dashboard/stats", dashboardStatsContract),`,
  );

  return src;
});

// ── prefetch/hr.ts ─────────────────────────────────────────────────────────
patch(`${FE}/lib/prefetch/hr.ts`, (src) => {
  src = src.replace(
    `import { serverGet } from "@/lib/server-fetch";`,
    `import { serverGet } from "@/lib/server-fetch";
import { hrDocumentListContract, hrAssetListContract } from "@/lib/prefetch/prefetch-schema";`,
  );

  src = src.replace(
    `queryFn: () => serverGet<HrDocumentListResponse>("/hr/documents?limit=20"),`,
    `queryFn: () => serverGet<HrDocumentListResponse>("/hr/documents?limit=20", hrDocumentListContract),`,
  );

  src = src.replace(
    `queryFn: () => serverGet<HrAssetListResponse>("/hr/assets?page=1&limit=20"),`,
    `queryFn: () => serverGet<HrAssetListResponse>("/hr/assets?page=1&limit=20", hrAssetListContract),`,
  );

  return src;
});

// ── prefetch/notifications.ts ─────────────────────────────────────────────────
patch(`${FE}/lib/prefetch/notifications.ts`, (src) => {
  src = src.replace(
    `import { serverGet } from "@/lib/server-fetch";`,
    `import { serverGet } from "@/lib/server-fetch";
import { notificationCursorPageContract, notificationUnreadCountContract } from "@/lib/prefetch/prefetch-schema";`,
  );

  src = src.replace(
    `const page = await serverGet<IdCursorPage<Notification>>(\n          \`/notifications?section=ALL&limit=\${INBOX_LIMIT}\`,\n        );`,
    `const page = await serverGet<IdCursorPage<Notification>>(\n          \`/notifications?section=ALL&limit=\${INBOX_LIMIT}\`,\n          notificationCursorPageContract,\n        );`,
  );

  src = src.replace(
    `serverGet<UnreadCount>("/notifications/unread-count"),`,
    `serverGet<UnreadCount>("/notifications/unread-count", notificationUnreadCountContract),`,
  );

  return src;
});

// ── use-global-search.ts ──────────────────────────────────────────────────────
patch(`${FE}/components/command-palette/hooks/use-global-search.ts`, (src) => {
  src = src.replace(
    `import { keepPreviousData, useQuery } from "@tanstack/react-query";`,
    `import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { lazyContract } from "@/lib/api-envelope";`,
  );

  src = src.replace(
    `const EMPTY_RESULTS: readonly GlobalSearchResult[] = [];`,
    `const EMPTY_RESULTS: readonly GlobalSearchResult[] = [];

const globalSearchC = lazyContract(() =>
  import("@/components/command-palette/hooks/global-search-schema").then((m) => m.globalSearchContract),
);`,
  );

  src = src.replace(
    `apiClient.get<GlobalSearchResponse>("/search", { q: trimmed }, signal)`,
    `apiClient.get<GlobalSearchResponse>("/search", { q: trimmed }, signal, globalSearchC)`,
  );

  return src;
});

console.log("Done.");
