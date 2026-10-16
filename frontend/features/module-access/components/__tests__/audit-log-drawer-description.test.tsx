import { render, screen } from "@testing-library/react";
import { AuditLogDrawer } from "@/features/module-access/components/audit-log-drawer";

/** UX-07: the audit log sheet opened with a title but no accessible description. */

jest.mock("@/hooks/common/use-mobile", () => ({ useIsMobile: () => false }));
jest.mock("@/hooks/api/module-access", () => ({
  useModuleAuditLog: () => ({
    data: { pages: [{ data: [] }] },
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
  }),
}));

describe("AuditLogDrawer", () => {
  it("names its purpose through aria-describedby", () => {
    render(<AuditLogDrawer moduleKey="hr" open onOpenChange={jest.fn()} />);
    const dialog = screen.getByRole("dialog", { name: /audit log/i });
    expect(dialog).toHaveAccessibleDescription(/access and role changes/i);
  });
});
