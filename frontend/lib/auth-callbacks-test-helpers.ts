import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

export const USER = "11111111-1111-4111-8111-111111111111";
export const SESSION_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const SESSION_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const ORG = "22222222-2222-4222-8222-222222222222";
export const ORG_OTHER = "33333333-3333-4333-8333-333333333333";

export function sessionDataPayload(orgId: string | null): Record<string, unknown> {
  return {
    userId: USER,
    email: "probe@example.test",
    firstName: "Probe",
    lastName: "User",
    name: "Probe User",
    image: null,
    role: "MEMBER",
    isActive: true,
    orgId,
    isOrgOwner: false,
    enabledModules: ["build"],
    plan: null,
    orgOnboardingCompletedAt: null,
    userOnboardingCompletedAt: null,
    organizationAccess: orgId ? "active" : "none",
    suspendedOrganizationName: null,
    isPlatformAdmin: false,
  };
}

export function backendJwt(sessionId: string, orgId: string | null): string {
  const header = Buffer.from('{"alg":"RS256"}').toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: USER,
      sessionId,
      orgId,
      exp: Math.floor(Date.now() / 1000) + 3_600,
    }),
  ).toString("base64url");
  return `${header}.${payload}.signature-${sessionId}-${orgId ?? "none"}`;
}

export interface TransportPlan {
  sessionDataOrgId?: string | null;
  sessionDataStatus?: number;
  exchangeStatus?: number;
  exchangeToken?: string;
}

export interface Transport {
  sessionDataCalls: number;
  exchangeCalls: number;
  exchangeBodies: unknown[];
}

export function installTransport(plan: TransportPlan = {}): Transport {
  const state: Transport = {
    sessionDataCalls: 0,
    exchangeCalls: 0,
    exchangeBodies: [],
  };
  const {
    sessionDataOrgId = ORG,
    sessionDataStatus = 200,
    exchangeStatus = 200,
    exchangeToken,
  } = plan;

  const fetchMock = jest.fn((url: unknown, init?: RequestInit) => {
    const href = String(url);
    if (href.includes("/auth/session-data/")) {
      state.sessionDataCalls += 1;
      return Promise.resolve({
        ok: sessionDataStatus >= 200 && sessionDataStatus < 300,
        status: sessionDataStatus,
        json: () =>
          Promise.resolve({
            success: true,
            data: sessionDataPayload(sessionDataOrgId),
          }),
      });
    }
    if (href.includes("/auth/session-exchange")) {
      state.exchangeCalls += 1;
      state.exchangeBodies.push(
        typeof init?.body === "string" ? JSON.parse(init.body) : init?.body,
      );
      return Promise.resolve({
        ok: exchangeStatus >= 200 && exchangeStatus < 300,
        status: exchangeStatus,
        json: () =>
          Promise.resolve({
            success: true,
            data: { token: exchangeToken ?? backendJwt(SESSION_A, ORG) },
          }),
      });
    }
    throw new Error(`unexpected fetch in test: ${href}`);
  });
  Object.defineProperty(globalThis, "fetch", {
    value: fetchMock,
    configurable: true,
    writable: true,
  });
  return state;
}

export function installMintingTransport(orgIdOf: () => string | null = () => ORG): Transport {
  const state: Transport = { sessionDataCalls: 0, exchangeCalls: 0, exchangeBodies: [] };
  let minted = 0;
  const fetchMock = jest.fn((url: unknown) => {
    const href = String(url);
    if (href.includes("/auth/session-data/")) {
      state.sessionDataCalls += 1;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: sessionDataPayload(orgIdOf()) }),
      });
    }
    state.exchangeCalls += 1;
    minted += 1;
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ success: true, data: { token: backendJwt(`mint-${minted}`, orgIdOf()) } }),
    });
  });
  Object.defineProperty(globalThis, "fetch", { value: fetchMock, configurable: true, writable: true });
  return state;
}

export function makeSession(): Session {
  return {
    user: { id: "", email: "", name: null, image: null, role: "" },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

export function makeToken(sessionId: string | undefined, orgId: string | null = ORG): JWT {
  return {
    id: USER,
    email: "probe@example.test",
    sessionId,
    orgId,
    authProvider: "credentials",
  };
}
