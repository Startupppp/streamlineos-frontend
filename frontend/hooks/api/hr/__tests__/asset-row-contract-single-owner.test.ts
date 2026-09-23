import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { ZodError } from "zod";
import { assetRowContract, assetListPageContract } from "@/hooks/api/hr/assets-schema";

const HR_HOOKS_DIR = join(process.cwd(), "hooks", "api", "hr");

const BACKEND_SHAPED_ROW = {
  id: 7,
  orgId: "org-1",
  name: "MacBook Pro",
  type: "LAPTOP",
  brand: null,
  model: null,
  serialNumber: null,
  assignedTo: null,
  assignedToMembershipId: null,
  status: "AVAILABLE",
  purchaseDate: null,
  purchaseCost: null,
  location: null,
  notes: null,
  expectedReturnDate: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("assetRowContract", () => {
  it("is exported from exactly one module, so the create and list paths cannot drift apart", () => {
    const owners = readdirSync(HR_HOOKS_DIR)
      .filter((file) => file.endsWith(".ts"))
      .filter((file) =>
        /export\s+const\s+assetRowContract\b/.test(readFileSync(join(HR_HOOKS_DIR, file), "utf8")),
      );

    expect(owners).toEqual(["assets-schema.ts"]);
  });

  it("backs the list page contract, so both read paths parse through the same object", () => {
    const page = assetListPageContract.parse({
      data: [BACKEND_SHAPED_ROW],
      counts: { total: 1, available: 1, assigned: 0, maintenance: 0, retired: 0 },
      pagination: { limit: 20, nextCursor: null, hasMore: false },
    });

    expect(page.data[0]).toEqual(assetRowContract.parse(BACKEND_SHAPED_ROW));
  });

  it("requires an integer id, matching the backend integer column rather than loosening it", () => {
    expect(() => assetRowContract.parse({ ...BACKEND_SHAPED_ROW, id: 1.5 })).toThrow(ZodError);
  });
});
