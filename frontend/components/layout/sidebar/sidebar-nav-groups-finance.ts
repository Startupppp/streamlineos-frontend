import {
  ArrowDownToLine,
  BarChart3,
  BookOpen,
  Calculator,
  Coins,
  CreditCard,
  FileStack,
  FileText,
  HandCoins,
  Inbox,
  Landmark,
  Lock,
  NotebookPen,
  Percent,
  Receipt,
  RefreshCcw,
  Scale,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  Workflow,
} from "lucide-react";
import type { NavGroup } from "./sidebar-nav-types";

export const FINANCE_NAV_GROUPS: NavGroup[] = [
  {
    label: "Accounting & Finance",
    product: "finance",
    module: "finance",
    // `accounting:read` and not `accounting:view`: no route enforces the
    // latter, so the group offered itself on a key the server never checks.
    requiredPermission: ["accounting:read", "payments:providers:view"],
    routes: [
      {
        label: "Overview",
        icon: Calculator,
        href: "/accounting",
        exact: true,
        // `AccountingHubClient` gates on `accounting:read`, and 14 routes
        // enforce it. Aligned to the page, as three earlier nav corrections were.
        requiredPermission: "accounting:read",
      },
      {
        label: "Set up",
        icon: NotebookPen,
        href: "/accounting/setup",
        requiredPermission: "accounting:settings:read",
      },
      {
        label: "Money in",
        icon: TrendingUp,
        href: "/accounting/invoices",
        activePrefixes: ["/billing/invoices"],
        requiredPermission: "accounting:receivables:read",
        children: [
          {
            label: "Invoices",
            icon: FileText,
            href: "/accounting/invoices",
            activePrefixes: ["/billing/invoices"],
            requiredPermission: "accounting:receivables:read",
          },
          {
            label: "Customers",
            icon: Users,
            href: "/accounting/customers",
            requiredPermission: "accounting:read",
          },
          {
            label: "Credit notes",
            icon: RefreshCcw,
            href: "/accounting/credit-notes",
            requiredPermission: "accounting:credit-notes:read",
          },
          {
            label: "Payments received",
            icon: HandCoins,
            href: "/accounting/payments-received",
            requiredPermission: "accounting:receivables:read",
          },
          {
            label: "What customers owe us",
            icon: FileStack,
            href: "/accounting/aged-receivables",
            // Matches the page's own gate (`requirePermission("accounting:receivables:read")`).
            // It read `accounting:reports:read`, so anyone holding reports-but-not-receivables
            // was shown a link that answered 403.
            requiredPermission: "accounting:receivables:read",
          },
        ],
      },
      {
        label: "Money out",
        icon: ShoppingCart,
        href: "/accounting/purchase-bills",
        requiredPermission: "accounting:payables:read",
        children: [
          {
            label: "Bills",
            icon: Receipt,
            href: "/accounting/purchase-bills",
            requiredPermission: "accounting:payables:read",
          },
          {
            label: "Vendors",
            icon: Truck,
            href: "/accounting/vendors",
            requiredPermission: "accounting:read",
          },
          {
            label: "Debit notes",
            icon: RefreshCcw,
            href: "/accounting/vendor-credits",
            // This page renders `ApDocumentsPage`, which reads
            // `useCan("accounting:payables:read")` and fetches AP documents —
            // whose routes all require that same key. Nothing enforces
            // `accounting:vendor-credits:read`; the only vendor-credit route
            // is a POST on `:manage`. So the old gate was wrong in BOTH
            // directions: it showed the link to someone who would be refused,
            // and hid it from someone who could use it.
            requiredPermission: "accounting:payables:read",
          },
          {
            label: "Payments made",
            icon: ArrowDownToLine,
            href: "/accounting/vendor-payments",
            requiredPermission: "accounting:payables:read",
          },
          {
            label: "What we owe",
            icon: FileStack,
            href: "/accounting/aged-payables",
            requiredPermission: "accounting:reports:read",
          },
        ],
      },
      {
        label: "Banking",
        icon: Landmark,
        href: "/accounting/banking",
        requiredPermission: "accounting:banking:read",
        children: [
          {
            label: "Bank accounts",
            icon: Wallet,
            href: "/accounting/banking",
            exact: true,
            requiredPermission: "accounting:banking:read",
          },
          {
            label: "Import statement",
            icon: Inbox,
            href: "/accounting/banking/import",
            requiredPermission: "accounting:banking:import",
          },
          {
            label: "Reconciliation",
            icon: Scale,
            href: "/accounting/banking/reconciliation",
            requiredPermission: "accounting:banking:reconcile",
          },
        ],
      },
      {
        label: "The ledger",
        icon: BookOpen,
        href: "/accounting/coa",
        requiredPermission: "accounting:accounts:read",
        children: [
          {
            label: "Chart of accounts",
            icon: BookOpen,
            href: "/accounting/coa",
            requiredPermission: "accounting:accounts:read",
          },
          {
            label: "Journal entries",
            icon: NotebookPen,
            href: "/accounting/journal",
            requiredPermission: "accounting:journal:read",
          },
          {
            label: "General ledger",
            icon: FileStack,
            href: "/accounting/general-ledger",
            requiredPermission: "accounting:general-ledger:read",
          },
          {
            label: "Period close",
            icon: Lock,
            href: "/accounting/period-close",
            requiredPermission: "accounting:periods:read",
          },
          {
            label: "Opening balances",
            icon: Scale,
            href: "/accounting/opening-balances",
            requiredPermission: "accounting:settings:read",
          },
        ],
      },
      {
        label: "Reports",
        icon: BarChart3,
        href: "/accounting/reports",
        requiredPermission: "accounting:reports:read",
        children: [
          {
            label: "All reports",
            icon: BarChart3,
            href: "/accounting/reports",
            exact: true,
            requiredPermission: "accounting:reports:read",
          },
          {
            label: "Trial balance",
            icon: Scale,
            href: "/accounting/trial-balance",
            requiredPermission: "accounting:reports:read",
          },
          {
            label: "Profit & loss",
            icon: TrendingUp,
            href: "/accounting/profit-loss",
            requiredPermission: "accounting:reports:read",
          },
          {
            label: "Balance sheet",
            icon: Landmark,
            href: "/accounting/balance-sheet",
            requiredPermission: "accounting:reports:read",
          },
          {
            label: "Cash flow",
            icon: Coins,
            href: "/accounting/cash-flow",
            requiredPermission: "accounting:reports:read",
          },
          {
            label: "Ageing",
            icon: FileStack,
            href: "/accounting/reports/aging",
            requiredPermission: "accounting:reports:read",
          },
          {
            label: "Tax summary",
            icon: Percent,
            href: "/accounting/taxes",
            requiredPermission: "accounting:taxes:read",
          },
        ],
      },
      {
        label: "Access",
        icon: ShieldCheck,
        href: "/accounting/access",
        requiredPermission: "accounting:access:view",
      },
      {
        label: "Settings",
        icon: SlidersHorizontal,
        href: "/accounting/settings",
        requiredPermission: ["accounting:settings:read", "payments:providers:view"],
        children: [
          {
            label: "Accounting settings",
            icon: SlidersHorizontal,
            href: "/accounting/settings",
            exact: true,
            requiredPermission: "accounting:settings:read",
          },
          {
            label: "Automations",
            icon: Workflow,
            href: "/accounting/settings/automations",
            requiredPermission: "settings:automations:view",
          },
          {
            label: "Payment providers",
            icon: CreditCard,
            href: "/accounting/settings/payment-providers",
            requiredPermission: "payments:providers:view",
          },
        ],
      },
    ],
  },
];
