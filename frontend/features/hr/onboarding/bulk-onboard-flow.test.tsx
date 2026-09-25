import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BulkOnboardPreviewRow, BulkOnboardResult } from "@/types/hr";
import { buildBulkOnboardErrorReportRows } from "./bulk-onboard-error-report";
import { BulkOnboardPreviewTable } from "./bulk-onboard-preview-table";
import { BulkOnboardPanel } from "./bulk-onboard-panel";
import { mergeServerPreview, type BulkOnboardFlowRow } from "./use-bulk-onboard-flow";

const previewMutateAsync = jest.fn();
const commitMutate = jest.fn();

jest.mock("@/hooks/api/hr/employee-profile", () => ({
  useBulkOnboardPreview: () => ({ mutateAsync: previewMutateAsync, isPending: false }),
  useBulkOnboardEmployees: () => ({ mutate: commitMutate, isPending: false }),
}));
jest.mock("@/hooks/api/org-hierarchy", () => ({
  useOrgDepartments: () => ({ data: { data: [{ name: "Engineering", code: "ENG" }] } }),
}));
jest.mock("@/hooks/api/hr/reporting-manager-policy", () => ({
  useReportingManagerPolicy: () => ({ data: undefined }),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: () => false }));

function flowRow(fileRow: number, overrides: Partial<BulkOnboardFlowRow> = {}): BulkOnboardFlowRow {
  const email = `p${fileRow}@example.com`;
  return {
    fileRow,
    preview: { _idx: fileRow, firstName: "P", lastName: String(fileRow), email, designation: "Dev", department: "Engineering", phone: "", joiningDate: "", valid: true, errors: [] },
    payload: { firstName: "P", lastName: String(fileRow), email, designation: "Dev", department: "Engineering" },
    server: null,
    dependsOnFileRow: null,
    ...overrides,
  };
}

function serverRow(row: number, status: BulkOnboardPreviewRow["status"], overrides: Partial<BulkOnboardPreviewRow> = {}): BulkOnboardPreviewRow {
  return { row, email: `s${row}@example.com`, status, codes: [], messages: [], primaryManager: null, secondaryManagers: [], dependsOnRow: null, ...overrides };
}

describe("mergeServerPreview", () => {
  it("maps server rows (numbered over submitted rows) back to file rows, including dependsOnRow", () => {
    const clientRefused = flowRow(2, { payload: null, preview: { ...flowRow(2).preview, valid: false, errors: ["invalid email"] } });
    const rows = [flowRow(1), clientRefused, flowRow(3)];
    const merged = mergeServerPreview(rows, [serverRow(1, "READY"), serverRow(2, "WARNING", { dependsOnRow: 1 })]);

    expect(merged.map((row) => row.server?.status ?? null)).toEqual(["READY", null, "WARNING"]);
    expect(merged[2]?.dependsOnFileRow).toBe(1);
  });
});

describe("buildBulkOnboardErrorReportRows", () => {
  it("lists every row that did not become an employee, by file row", () => {
    const rows = [
      flowRow(1, { server: serverRow(1, "READY") }),
      flowRow(2, { payload: null, preview: { ...flowRow(2).preview, valid: false, errors: ["invalid email"] } }),
      flowRow(3, { server: serverRow(2, "SKIPPED", { codes: ["MANAGER_ROW_FAILED"], messages: ["Manager row 4 failed"] }) }),
      flowRow(4, { server: serverRow(3, "WARNING") }),
    ];
    const result: BulkOnboardResult = {
      total: 2,
      created: 1,
      failed: 1,
      skipped: 0,
      results: [
        { row: 1, email: "p1@example.com", success: true, status: "CREATED", codes: [], primaryManager: null },
        { row: 2, email: "p4@example.com", success: false, error: "Email already a member", status: "FAILED", codes: ["X"], primaryManager: null },
      ],
    };

    expect(buildBulkOnboardErrorReportRows(rows, { result, fileRows: [1, 4] })).toEqual([
      { row: 2, email: "p2@example.com", status: "ERROR", codes: "", details: "invalid email" },
      { row: 3, email: "p3@example.com", status: "SKIPPED", codes: "MANAGER_ROW_FAILED", details: "Manager row 4 failed" },
      { row: 4, email: "p4@example.com", status: "FAILED", codes: "X", details: "Email already a member" },
    ]);
  });
});

describe("BulkOnboardPreviewTable — bulk-row diagnostics", () => {
  it("shows each status, the fallback person and the in-file dependency", () => {
    render(
      <BulkOnboardPreviewTable
        rows={[
          flowRow(1, { server: serverRow(1, "READY", { primaryManager: { userId: null, name: "Dana Default", email: "dana@example.com", resolution: "FALLBACK_CONFIGURED" } }) }),
          flowRow(2, {
            server: serverRow(2, "WARNING", { primaryManager: { userId: null, name: "New Lead", email: "lead@example.com", resolution: "IN_FILE" }, dependsOnRow: 1 }),
            dependsOnFileRow: 1,
          }),
          flowRow(3, { server: serverRow(3, "ERROR", { codes: ["PRIMARY_CYCLE"], messages: ["Would create a loop"] }) }),
          flowRow(4, { server: serverRow(4, "SKIPPED", { messages: ["Manager row 3 failed"] }) }),
          flowRow(5, { payload: null, preview: { ...flowRow(5).preview, valid: false, errors: ["invalid primaryManagerEmail"] } }),
        ]}
      />,
    );

    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("Warning")).toBeInTheDocument();
    expect(screen.getAllByText("Error")).toHaveLength(2);
    expect(screen.getByText("Skipped")).toBeInTheDocument();
    expect(screen.getByText("Dana Default")).toBeInTheDocument();
    expect(screen.getByText("Fallback")).toBeInTheDocument();
    expect(screen.getByText(/created by row 1 \(lead@example.com\)/)).toBeInTheDocument();
    expect(screen.getByText("PRIMARY_CYCLE")).toBeInTheDocument();
    expect(screen.getByText("invalid primaryManagerEmail")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/automatic/i);
  });
});

describe("BulkOnboardPreviewTable — top-level rows", () => {
  it("shows a declared top-level row as Top-level, not as having no manager", () => {
    const founder = flowRow(5, {
      payload: { ...flowRow(5).payload!, topLevelRole: true, topLevelRoleReason: "Founder" },
      server: serverRow(1, "READY", { primaryManager: null }),
    });
    render(<BulkOnboardPreviewTable rows={[founder]} />);
    expect(screen.getByText("Top-level role")).toBeInTheDocument();
    expect(screen.queryByText("No manager")).not.toBeInTheDocument();
  });
});

describe("BulkOnboardPanel — commits only Ready and Warning rows after confirmation", () => {
  it("previews on the server, then submits exactly the committable rows", async () => {
    const user = userEvent.setup();
    const csv = [
      "firstName,lastName,email,designation,department,primaryManagerEmail",
      "Ann,One,ann@example.com,Dev,Engineering,",
      "Bob,Two,bob@example.com,Dev,Engineering,ann@example.com",
      "Cy,Three,cy@example.com,Dev,Engineering,boss@example.com",
      "Di,Four,not-an-email,Dev,Engineering,",
    ].join("\n");
    const file = new File([csv], "people.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve(csv) });
    previewMutateAsync.mockResolvedValue({
      rows: [serverRow(1, "READY"), serverRow(2, "WARNING", { dependsOnRow: 1 }), serverRow(3, "ERROR")],
      counts: { ready: 1, warning: 1, error: 1, skipped: 0 },
    });

    render(<BulkOnboardPanel />);
    await user.upload(screen.getByLabelText("Choose employee onboard file"), file);

    await waitFor(() => expect(previewMutateAsync).toHaveBeenCalledTimes(1));
    // The client-refused row (bad email) never reaches the server.
    expect(previewMutateAsync.mock.calls[0]?.[0].map((row: { email: string }) => row.email)).toEqual([
      "ann@example.com",
      "bob@example.com",
      "cy@example.com",
    ]);

    await user.click(await screen.findByRole("button", { name: "Create 2 employees" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/2 rows will not be created/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Create 2 employees" }));

    expect(commitMutate).toHaveBeenCalledTimes(1);
    const submitted = commitMutate.mock.calls[0]?.[0];
    expect(submitted.map((row: { email: string }) => row.email)).toEqual(["ann@example.com", "bob@example.com"]);
    expect(submitted[1]).toMatchObject({ primaryManagerEmail: "ann@example.com" });
    expect(submitted[1]).not.toHaveProperty("reportingManagerEmail");
  });
});

describe("BulkOnboardPanel — while the reporting policy is still loading", () => {
  it("does not assume a secondary cap: the row reaches the server preview", async () => {
    const user = userEvent.setup();
    const csv = [
      "firstName,lastName,email,designation,department,secondaryManagerEmail1,secondaryManagerEmail2,secondaryManagerEmail3",
      "Ann,One,ann@example.com,Dev,Engineering,a@example.com,b@example.com,c@example.com",
    ].join("\n");
    const file = new File([csv], "people.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve(csv) });
    previewMutateAsync.mockResolvedValue({ rows: [serverRow(1, "ERROR", { codes: ["SECONDARY_CAP_EXCEEDED"] })], counts: { ready: 0, warning: 0, error: 1, skipped: 0 } });

    render(<BulkOnboardPanel />);
    await user.upload(screen.getByLabelText("Choose employee onboard file"), file);

    await waitFor(() => expect(previewMutateAsync).toHaveBeenCalled());
    expect(previewMutateAsync.mock.calls.at(-1)?.[0]).toEqual([
      expect.objectContaining({ email: "ann@example.com", secondaryManagerEmail3: "c@example.com" }),
    ]);
  });
});

describe("BulkOnboardPanel — rows keep their file number through preview and result", () => {
  it("names a row by its place in the file even after a blank line", async () => {
    const user = userEvent.setup();
    const csv = [
      "firstName,lastName,email,designation,department",
      "Ann,One,ann@example.com,Dev,Engineering",
      "",
      "Fay,Founder,fay@example.com,Dev,Engineering",
    ].join("\n");
    const file = new File([csv], "people.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve(csv) });
    previewMutateAsync.mockResolvedValue({ rows: [serverRow(1, "READY"), serverRow(2, "READY")], counts: { ready: 2, warning: 0, error: 0, skipped: 0 } });
    commitMutate.mockImplementation((_rows: unknown, handlers: { onSuccess: (result: BulkOnboardResult) => void }) =>
      handlers.onSuccess({
        total: 2,
        created: 1,
        failed: 1,
        skipped: 0,
        results: [
          { row: 1, email: "ann@example.com", success: true, status: "CREATED", codes: [], primaryManager: null },
          { row: 2, email: "fay@example.com", success: false, error: "Already a member", status: "FAILED", codes: [], primaryManager: null },
        ],
      }),
    );

    render(<BulkOnboardPanel />);
    await user.upload(screen.getByLabelText("Choose employee onboard file"), file);
    const table = await screen.findByRole("region", { name: "Preview rows" });
    expect(within(table).getByText("fay@example.com").closest("tr")).toHaveTextContent(/^3/);
    // One keyboard stop, and it is the element that scrolls.
    expect(table).toHaveAttribute("tabindex", "0");
    expect(table).toHaveClass("overflow-auto");
    expect(within(table).queryByRole("region")).not.toBeInTheDocument();
    expect(table.parentElement?.closest("[tabindex='0']")).toBeNull();

    await user.click(await screen.findByRole("button", { name: "Create 2 employees" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Create 2 employees" }));

    expect(await screen.findByText("Row 3")).toBeInTheDocument();
    expect(screen.queryByText("Row 2")).not.toBeInTheDocument();
  });
});
