import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { backendPath, backendReachable } from "@/lib/test-support/backend-path";
import type { AccountSystemTagMapping } from "@/types/accounting-kernel";
import { AccountMappingsCard } from "../account-mappings-card";

/**
 * ACC-04. Inventory resolves GL accounts by role, and until now nothing in this
 * app could see or change which account fills one: `PATCH
 * /accounting/accounts/:id/system-tag` has existed since the kernel landed and
 * had no caller anywhere in the frontend. A role could be seeded from the chart
 * template and never moved.
 *
 * The screen's job is to show what is NOT mapped. A book missing `inventory`
 * refuses its next goods receipt AFTER the stock has already moved
 * (`docs/inventory-gl-contract.md` §3.3), so the warning has to be specific
 * about that rather than reading as a general setup nag.
 */

const can = jest.fn<boolean, [string]>();
const mappings = jest.fn();
const postable = jest.fn();
const mutate = jest.fn();

jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => can(key) }));
jest.mock("@/hooks/api/accounting/ledger", () => ({
  useAccountMappings: () => mappings(),
  usePostableAccounts: () => postable(),
  useSetAccountSystemTag: () => ({ mutate, isPending: false }),
}));

function mapping(over: Partial<AccountSystemTagMapping>): AccountSystemTagMapping {
  return {
    tag: "inventory",
    allowedAccountTypes: ["ASSET"],
    account: null,
    requiredByInventory: true,
    awaitingInventorySupport: false,
    ...over,
  } as AccountSystemTagMapping;
}

beforeEach(() => {
  jest.clearAllMocks();
  can.mockReturnValue(true);
  postable.mockReturnValue({ data: [], isLoading: false });
  mappings.mockReturnValue({ data: [], isLoading: false });
});

describe("the account-mapping card", () => {
  it("counts the required roles nobody has mapped", () => {
    mappings.mockReturnValue({
      data: [
        mapping({ tag: "inventory", account: null }),
        mapping({ tag: "cogs", allowedAccountTypes: ["EXPENSE"], account: null }),
        mapping({
          tag: "sales",
          allowedAccountTypes: ["INCOME"],
          account: { id: "a1", code: "4100", name: "Sales", accountType: "INCOME" },
        }),
      ],
      isLoading: false,
    });

    render(<AccountMappingsCard enabled />);
    expect(screen.getByText("2 not mapped")).toBeInTheDocument();
  });

  it("says the refusal arrives after the stock has moved", () => {
    /*
      The sentence that makes this actionable. "Finish setting up accounting"
      would be true and would not tell anyone that the cost of ignoring it is a
      half-completed goods receipt.
    */
    mappings.mockReturnValue({ data: [mapping({ account: null })], isLoading: false });

    render(<AccountMappingsCard enabled />);
    expect(
      screen.getByText(/refused after the stock has already moved/),
    ).toBeInTheDocument();
  });

  it("does not warn when every required role is mapped", () => {
    mappings.mockReturnValue({
      data: [
        mapping({
          account: { id: "a1", code: "1300", name: "Inventory", accountType: "ASSET" },
        }),
      ],
      isLoading: false,
    });

    render(<AccountMappingsCard enabled />);
    expect(screen.queryByText(/not mapped/)).not.toBeInTheDocument();
    expect(screen.getByText(/resolve accounts by role/)).toBeInTheDocument();
  });

  it("marks a seeded role nothing posts to yet as unused, not as a gap", () => {
    /*
      `grni` is correct, seeded and resolved by no call site. Badging it
      "Required" would be a lie; omitting it would hide a mapping an operator
      may want to move before it starts being used.
    */
    mappings.mockReturnValue({
      data: [
        mapping({
          tag: "grni",
          allowedAccountTypes: ["LIABILITY"],
          account: { id: "a2", code: "2110", name: "GRNI", accountType: "LIABILITY" },
          requiredByInventory: false,
          awaitingInventorySupport: true,
        }),
      ],
      isLoading: false,
    });

    render(<AccountMappingsCard enabled />);
    expect(screen.getByText("Not used yet")).toBeInTheDocument();
    expect(screen.queryByText("Required")).not.toBeInTheDocument();
  });

  it("shows the mapping read-only to someone who cannot change it", () => {
    can.mockReturnValue(false);
    mappings.mockReturnValue({
      data: [
        mapping({
          account: { id: "a1", code: "1300", name: "Inventory", accountType: "ASSET" },
        }),
      ],
      isLoading: false,
    });

    render(<AccountMappingsCard enabled />);
    expect(screen.getByText("1300")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("hides itself entirely when the org has no book", () => {
    /* Nothing to map into; an empty mapping card would only ask an unanswerable question. */
    const { container } = render(<AccountMappingsCard enabled={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("leaves the forty-odd roles inventory does not use off the screen", () => {
    mappings.mockReturnValue({
      data: [
        mapping({ tag: "inventory" }),
        mapping({
          tag: "retained_earnings",
          allowedAccountTypes: ["EQUITY"],
          requiredByInventory: false,
          awaitingInventorySupport: false,
        }),
      ],
      isLoading: false,
    });

    render(<AccountMappingsCard enabled />);
    expect(screen.getByText("Inventory asset")).toBeInTheDocument();
    expect(screen.queryByText("retained_earnings")).not.toBeInTheDocument();
  });
});

describe("the mapping surface matches the API it reads", () => {
  it("names a route the backend actually serves", () => {
    /*
      Asserted, never skipped: five cross-repo guards in this repo once resolved
      to a path that does not exist and stayed green for months.
    */
    const relative = "src/modules/accounting/kernel/kernel.controller.ts";
    expect(backendReachable(relative)).toBe(true);
    const controller = readFileSync(backendPath(relative), "utf8");
    expect(controller).toContain('@Get("accounts/mappings")');
    expect(controller).toContain('@Patch("accounts/:accountId/system-tag")');
  });

  it("carries every system role the ledger can hold", () => {
    /*
      This screen filters the API's rows by two booleans. If the frontend union
      drifted behind `gl_system_tag`, a role the backend flagged as required
      would still render — but every switch and lookup keyed on the tag would
      silently miss it, and a future role would be invisible here with no error.
    */
    const relative = "src/db/schema/accounting/gl-kernel.ts";
    expect(backendReachable(relative)).toBe(true);
    const schema = readFileSync(backendPath(relative), "utf8");
    const block = schema.slice(
      schema.indexOf('pgEnum("gl_system_tag"'),
      schema.indexOf("]);", schema.indexOf('pgEnum("gl_system_tag"')),
    );
    const backendTags = [...block.matchAll(/"([a-z_]+)"/g)]
      .map((m) => m[1]!)
      .filter((t) => t !== "gl_system_tag");
    expect(backendTags.length).toBeGreaterThan(40);

    const types = readFileSync(join(__dirname, "../../../../types/accounting-kernel.ts"), "utf8");
    const union = types.slice(
      types.indexOf("export type GlSystemTag ="),
      types.indexOf(";", types.indexOf("export type GlSystemTag =")),
    );
    const missing = backendTags.filter((tag) => !union.includes(`"${tag}"`));
    expect(missing).toEqual([]);
  });
});
