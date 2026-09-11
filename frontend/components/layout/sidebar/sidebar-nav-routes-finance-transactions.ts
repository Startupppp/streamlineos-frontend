import { Users, Clock, Receipt, FileText, Wallet, TrendingUp, Bell, Scale, Coins, Landmark, RefreshCcw, Inbox, ArrowLeftRight, ShoppingCart, Truck, PlayCircle, ArrowDownToLine, HandCoins, FileStack } from "lucide-react";
import type { NavRoute } from "./sidebar-nav-types";

export const FINANCE_TRANSACTION_ROUTES: NavRoute[] = [
      {
        label: "Sales",
        icon: TrendingUp,
        href: "/accounting/invoices",
        activePrefixes: ["/billing/invoices"],
        requiredPermission: "accounting:read",
        children: [
          {
            label: "Invoices",
            icon: FileText,
            href: "/accounting/invoices",
            activePrefixes: ["/billing/invoices"],
            requiredPermission: "accounting:read",
          },
          {
            label: "Customers",
            icon: Users,
            href: "/accounting/customers",
            requiredPermission: "accounting:reports:read",
          },
          {
            label: "Recurring invoices",
            icon: RefreshCcw,
            href: "/accounting/recurring-invoices",
            requiredPermission: "accounting:recurring:read",
          },
          {
            label: "Credit notes",
            icon: FileStack,
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
            label: "Payment reminders",
            icon: Bell,
            href: "/accounting/payment-reminders",
            requiredPermission: "accounting:reminders:read",
          },
          {
            label: "Aged receivables",
            icon: Clock,
            href: "/accounting/aged-receivables",
            requiredPermission: "accounting:reports:read",
          },
        ],
      },
      {
        label: "Purchases",
        icon: ShoppingCart,
        href: "/accounting/purchase-bills",
        requiredPermission: "accounting:journal:read",
        children: [
          {
            label: "Purchase bills",
            icon: Receipt,
            href: "/accounting/purchase-bills",
            requiredPermission: "accounting:journal:read",
          },
          {
            label: "Vendors",
            icon: Truck,
            href: "/accounting/vendors",
            requiredPermission: "accounting:reports:read",
          },
          {
            label: "Recurring bills",
            icon: RefreshCcw,
            href: "/accounting/recurring-bills",
            requiredPermission: "accounting:recurring:read",
          },
          {
            label: "Vendor credits",
            icon: FileStack,
            href: "/accounting/vendor-credits",
            requiredPermission: "accounting:vendor-credits:read",
          },
          {
            label: "Vendor payments",
            icon: Coins,
            href: "/accounting/vendor-payments",
            requiredPermission: "accounting:payables:read",
          },
          {
            label: "Payment runs",
            icon: PlayCircle,
            href: "/accounting/payment-runs",
            requiredPermission: "accounting:payment-runs:read",
          },
          {
            label: "Aged payables",
            icon: Clock,
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
            icon: Landmark,
            href: "/accounting/banking",
            exact: true,
            requiredPermission: "accounting:banking:read",
          },
          {
            label: "Import statement",
            icon: ArrowDownToLine,
            href: "/accounting/banking/import",
            requiredPermission: "accounting:banking:read",
          },
          {
            label: "Reconciliation",
            icon: Scale,
            href: "/accounting/banking/reconciliation",
            requiredPermission: "accounting:banking:reconcile",
          },
          {
            label: "Transfers",
            icon: ArrowLeftRight,
            href: "/accounting/banking/transfers",
            requiredPermission: "accounting:banking:read",
          },
        ],
      },
      {
        label: "Expenses",
        icon: Wallet,
        href: "/accounting/expenses",
        requiredPermission: "accounting:reimbursements:read",
        children: [
          {
            label: "Expenses",
            icon: Wallet,
            href: "/accounting/expenses",
            exact: true,
            requiredPermission: "accounting:reimbursements:read",
          },
          {
            label: "Receipt inbox",
            icon: Inbox,
            href: "/accounting/expenses/receipts",
            requiredPermission: "accounting:reimbursements:read",
          },
          {
            label: "Reimbursements",
            icon: RefreshCcw,
            href: "/accounting/expenses/reimbursements",
            requiredPermission: "accounting:reimbursements:read",
          },
          {
            label: "Policies",
            icon: FileText,
            href: "/accounting/expenses/policies",
            requiredPermission: "accounting:reimbursements:read",
          },
        ],
      },
];
