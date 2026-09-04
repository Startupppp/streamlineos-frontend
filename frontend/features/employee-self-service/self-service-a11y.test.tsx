/**
 * PRD-C115 — responsive accessibility for the `/me/*` self-service surface.
 *
 * Home's widget grid is covered by `features/dashboard/home-a11y.test.tsx`.
 * This file covers the other half of the criterion's surface: the self-service
 * pages every active member gets regardless of which products the tenant pays
 * for. Before it, none of the four `/me/*` routes had an axe assertion of any
 * kind.
 *
 * Each page is driven through all four states — loading, loaded, empty and
 * error — at 375 / 768 / 1280, and the error state is additionally asserted to
 * be ANNOUNCED: axe passes a silent `<p>` quite happily, so a failure that
 * reaches a sighted user and nobody else is invisible to axe alone.
 */

import * as React from "react";
import { render, screen } from "@testing-library/react";
import { expectNoAxeViolations } from "@/test-utils/axe";
import { atViewport, VIEWPORTS, type ViewportName } from "@/test-utils/viewport";
import { TooltipProvider } from "@/components/ui/tooltip";

type QueryLike = {
  data: unknown;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
};

const refetch = jest.fn();

function loading(): QueryLike {
  return { data: undefined, isLoading: true, isError: false, error: null, refetch };
}
function failed(message: string): QueryLike {
  return { data: undefined, isLoading: false, isError: true, error: new Error(message), refetch };
}
function answered(data: unknown): QueryLike {
  return { data, isLoading: false, isError: false, error: null, refetch };
}

const q: { documents: QueryLike; expenses: QueryLike } = {
  documents: loading(),
  expenses: loading(),
};

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/me/expenses",
}));

jest.mock("@/hooks/api/hr/documents", () => ({
  useMyOnboardingDocs: () => q.documents,
}));

jest.mock("@/hooks/api/hr/expenses", () => ({
  useExpensePageData: () => q.expenses,
}));

jest.mock("@/features/hr/document-review/upload-doc-sheet", () => ({
  UploadDocSheet: () => null,
}));

jest.mock("@/features/hr/expenses/components/create-expense-dialog", () => ({
  CreateExpenseDialog: () => null,
}));

import { MyDocumentsPage } from "./components/my-documents-page";
import { MyExpensesPage } from "./components/my-expenses-page";

const DOCUMENT_ROWS = [
  {
    id: 1,
    documentTypeName: "PAN card",
    status: "PENDING" as const,
    isMandatory: true,
    remarks: null,
  },
  {
    id: 2,
    documentTypeName: "Offer letter",
    status: "APPROVED" as const,
    isMandatory: false,
    remarks: null,
  },
];

const EXPENSE_ROWS = [
  {
    id: 1,
    title: "Client dinner",
    amount: "2400",
    currency: "INR",
    category: "MEALS",
    status: "PENDING",
    expenseDate: "2026-09-01",
    createdAt: "2026-09-01T00:00:00.000Z",
    paymentMethod: "CARD",
    merchant: "Bistro",
    description: null,
    receiptUrl: null,
    rejectionReason: null,
    user: { id: "user_1", name: "Ada", email: "ada@example.test", image: null },
  },
];

const DOCUMENTS_FAILURE = "documents service is down";
const EXPENSES_FAILURE = "expenses service is down";

type PageState = "loading" | "loaded" | "empty" | "error";

function setState(state: PageState): void {
  if (state === "loading") {
    q.documents = loading();
    q.expenses = loading();
    return;
  }
  if (state === "error") {
    q.documents = failed(DOCUMENTS_FAILURE);
    q.expenses = failed(EXPENSES_FAILURE);
    return;
  }
  const documentRows = state === "loaded" ? DOCUMENT_ROWS : [];
  const expenseRows = state === "loaded" ? EXPENSE_ROWS : [];
  q.documents = answered({ data: documentRows });
  q.expenses = answered({
    expenses: expenseRows,
    isAdmin: false,
    stats: null,
    pagination: {
      page: 1,
      pageSize: 10,
      total: expenseRows.length,
      totalPages: expenseRows.length ? 1 : 0,
    },
  });
}

const PAGES: ReadonlyArray<{
  route: string;
  Component: React.ComponentType;
  failure: string;
}> = [
  { route: "/me/documents", Component: MyDocumentsPage, failure: DOCUMENTS_FAILURE },
  { route: "/me/expenses", Component: MyExpensesPage, failure: EXPENSES_FAILURE },
];

const VIEWPORT_NAMES: ViewportName[] = ["mobile", "tablet", "desktop"];
const STATES: PageState[] = ["loading", "loaded", "empty", "error"];

describe("PRD-C115 — /me/* self-service pages are accessible in every state, at every breakpoint", () => {
  let restore: (() => void) | undefined;

  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  for (const { route, Component } of PAGES) {
    for (const viewport of VIEWPORT_NAMES) {
      for (const state of STATES) {
        it(`MEASURED: axe reports no violation for ${route} in its ${state} state at ${viewport} (${VIEWPORTS[viewport]}px)`, async () => {
          restore = atViewport(viewport);
          setState(state);
          const { baseElement } = render(
            <TooltipProvider>
              <Component />
            </TooltipProvider>,
          );
          await expectNoAxeViolations(baseElement);
        });
      }
    }
  }
});

describe("PRD-C115 — a failed /me/* read is announced, not silent", () => {
  for (const { route, Component, failure } of PAGES) {
    it(`MEASURED: ${route} puts its failure in a live region with a retry`, async () => {
      setState("error");
      render(
        <TooltipProvider>
          <Component />
        </TooltipProvider>,
      );

      const message = await screen.findByText(failure);
      const live = message.closest('[role="alert"], [role="status"], [aria-live]');
      expect(live).not.toBeNull();
      expect(screen.getByRole("button", { name: /try again|retry/i })).toBeInTheDocument();
    });
  }

  it("MEASURED: an empty self-service page is NOT dressed up as a failure", async () => {
    setState("empty");
    render(
      <TooltipProvider>
        <MyDocumentsPage />
      </TooltipProvider>,
    );

    expect(await screen.findByText("No documents requested")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
