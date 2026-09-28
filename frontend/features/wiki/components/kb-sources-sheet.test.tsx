import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { backendPath } from "@/test-utils/backend-repo";
import { KB_ASK_STATUS_SCOPES } from "@/hooks/api/kb/ask";
import { KB_PAGE_STATUSES } from "@/hooks/api/kb/kb-analytics-schema";
import { KbSourcesSheet } from "./kb-sources-sheet";

const BACKEND_ASK_SCHEMA = backendPath(
  "src/modules/kb/retrieval/dto/kb-ai.schemas.ts",
);

function backendAskStatusScopes(): string[] {
  const source = readFileSync(BACKEND_ASK_SCHEMA, "utf8");
  const declaration = /export const KB_ASK_STATUS_SCOPES\s*=\s*\[([\s\S]*?)\]\s*as const/.exec(source);
  if (declaration === null)
    throw new Error(`KB_ASK_STATUS_SCOPES not found in ${BACKEND_ASK_SCHEMA}`);
  return [...declaration[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

describe("KB ask status vocabulary — one catalogue, not two hand-written lists", () => {
  it("matches the backend's KB_ASK_STATUS_SCOPES exactly, so a status added or removed there fails here instead of 400ing at runtime against a .strict() schema", () => {
    expect([...KB_ASK_STATUS_SCOPES]).toEqual(backendAskStatusScopes());
  });

  it("is derived from the shared page-status catalogue rather than retyped, so a new page status flows through instead of being silently unofferable", () => {
    expect([...KB_ASK_STATUS_SCOPES]).toEqual(
      KB_PAGE_STATUSES.filter((status) => status !== "archived"),
    );
  });

  it("excludes archived, because every Ask candidate query filters ne(status, 'archived') unconditionally so the option could only ever return nothing", () => {
    expect(KB_ASK_STATUS_SCOPES).not.toContain("archived");
  });
});

const SCOPE_PROPS = {
  mode: "scope" as const,
  open: true,
  onOpenChange: jest.fn(),
  sources: [],
  isLoading: false,
  selectedIds: [],
  onSelectionChange: jest.fn(),
  verifiedOnly: false,
  onVerifiedOnlyChange: jest.fn(),
  currentUserId: "user-1",
  kindFilter: "all" as const,
  onKindFilterChange: jest.fn(),
  ownerFilter: "all" as const,
  onOwnerFilterChange: jest.fn(),
  spaceIdFilter: null,
  onSpaceIdFilterChange: jest.fn(),
  spaces: [{ id: 10, name: "Engineering" }],
  ownerMembershipId: null,
  onOwnerMembershipIdChange: jest.fn(),
  owners: [
    { membershipId: 77, name: "Ada Lovelace", email: "ada@example.com" },
  ],
  onOwnerSearchChange: jest.fn(),
  ownersAreLoading: false,
  statusScope: null,
  onStatusScopeChange: jest.fn(),
  onConfirm: jest.fn(),
  pageSearchQuery: "",
  onPageSearchQueryChange: jest.fn(),
  pageSearchResults: [],
  pageSearchIsLoading: false,
  selectedPageIds: [],
  onPageSelectionChange: jest.fn(),
};

describe("KbSourcesSheet scope mode — all six scope dimensions are present and editable before send", () => {
  it("renders one status button per backend-accepted status scope and no more", () => {
    render(<KbSourcesSheet {...SCOPE_PROPS} />);

    for (const label of ["Draft", "In review", "Published"])
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archived" })).not.toBeInTheDocument();
  });

  it("renders an owner combobox, the dimension that produces ownerMembershipId", () => {
    render(<KbSourcesSheet {...SCOPE_PROPS} />);

    expect(
      screen.getByRole("combobox", { name: /restrict answer to pages owned by a member/i }),
    ).toBeInTheDocument();
  });

  it("renders the space, verified-only and kind controls alongside them, which is the positive control proving this surface renders at all", () => {
    render(<KbSourcesSheet {...SCOPE_PROPS} />);

    expect(screen.getByRole("button", { name: "Engineering" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /verified sources only/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Files" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notes" })).toBeInTheDocument();
  });
});
