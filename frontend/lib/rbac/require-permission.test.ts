jest.mock("server-only", () => ({}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

jest.mock("next/headers", () => ({
  headers: jest.fn(async () => new Headers()),
}));

jest.mock("@/lib/get-server-auth", () => ({
  getServerAuth: jest.fn(async () => ({ user: { id: "user-1", isActive: true } })),
}));

jest.mock("@/lib/rbac/get-server-access", () => ({
  getServerAccessResult: jest.fn(),
}));

import { redirect } from "next/navigation";
import { getServerAccessResult } from "@/lib/rbac/get-server-access";
import { requireModulePermission } from "@/lib/rbac/require-permission";
import type { ModuleDenialReason } from "@/lib/page-state/page-state-schema";

function accessWith(
  modules: Record<string, boolean>,
  moduleReasons?: Record<string, ModuleDenialReason>,
): Awaited<ReturnType<typeof getServerAccessResult>> {
  return {
    ok: true,
    access: {
      scopes: {},
      isOrgOwner: false,
      canManageOrganizationMembership: false,
      modules,
      ...(moduleReasons ? { moduleReasons } : {}),
    },
  };
}

async function deniedReason(): Promise<string | null> {
  jest.mocked(redirect).mockClear();
  await expect(requireModulePermission("build")).rejects.toThrow("REDIRECT:");
  const target = jest.mocked(redirect).mock.calls.at(-1)?.[0] ?? "";
  return new URL(target, "http://local").searchParams.get("reason");
}

describe("requireModulePermission denial reason", () => {
  it("sends user-denied when only this person's module toggle is off", async () => {
    jest.mocked(getServerAccessResult).mockResolvedValue(
      accessWith({ build: false }, { build: "user-denied" }),
    );
    expect(await deniedReason()).toBe("user-denied");
  });

  it("sends org-disabled when the organisation switched the module off", async () => {
    jest.mocked(getServerAccessResult).mockResolvedValue(
      accessWith({ build: false }, { build: "org-disabled" }),
    );
    expect(await deniedReason()).toBe("org-disabled");
  });

  it("falls back to org-disabled for a snapshot that carries no reasons", async () => {
    jest.mocked(getServerAccessResult).mockResolvedValue(accessWith({ build: false }));
    expect(await deniedReason()).toBe("org-disabled");
  });

  it("does not redirect when the module is available", async () => {
    jest.mocked(getServerAccessResult).mockResolvedValue(accessWith({ build: true }));
    await expect(requireModulePermission("build")).resolves.toMatchObject({
      access: { modules: { build: true } },
    });
  });
});
