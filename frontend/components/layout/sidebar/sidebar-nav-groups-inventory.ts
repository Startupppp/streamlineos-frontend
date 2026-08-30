import { LayoutDashboard, FileText, BarChart3, ClipboardList, ShieldCheck, TrendingUp, Package, Globe, ClipboardCheck, RefreshCcw, History, BarChart2, Building2, SlidersHorizontal, Calculator, Tag, Warehouse, ArrowLeftRight, ShoppingCart, Truck, Activity, Layers, TrendingDown, Scan, Boxes, CalendarClock, Container, Upload, RotateCcw, PackageCheck, DollarSign, Scale, Gauge, Sparkles } from "lucide-react";
import type { NavGroup } from "./sidebar-nav-types";

export const INVENTORY_NAV_GROUPS: NavGroup[] = [
{
    label: "Inventory",
    product: "inventory",
    module: "inventory",
    requiredPermission: ["inventory:stock:read", "inventory:products:read"],
    routes: [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/inventory",
        exact: true,
        requiredPermission: ["inventory:stock:read", "inventory:reports:read"],
      },
      {
        label: "Products",
        icon: Tag,
        href: "/inventory/products",
        requiredPermission: "inventory:products:read",
        children: [
          {
            label: "Categories",
            icon: Layers,
            href: "/inventory/products/categories",
            requiredPermission: "inventory:products:read",
          },
          {
            label: "Units of Measure",
            icon: Calculator,
            href: "/inventory/products/uom",
            requiredPermission: "inventory:products:read",
          },
        ],
      },
      {
        label: "Stock",
        icon: Warehouse,
        href: "/inventory/stock",
        requiredPermission: "inventory:stock:read",
        children: [
          {
            label: "Adjustments",
            icon: ClipboardList,
            href: "/inventory/stock/adjustments",
            requiredPermission: "inventory:stock:read",
          },
          {
            label: "Transfers",
            icon: ArrowLeftRight,
            href: "/inventory/stock/transfers",
            requiredPermission: "inventory:stock:read",
          },
          {
            label: "Movements",
            icon: History,
            href: "/inventory/stock/movements",
            requiredPermission: "inventory:stock:read",
          },
        ],
      },
      {
        label: "Warehouses",
        icon: Building2,
        href: "/inventory/warehouses",
        requiredPermission: "inventory:warehouses:read",
      },
      {
        label: "Vendors",
        icon: Truck,
        href: "/inventory/vendors",
        requiredPermission: "inventory:vendors:read",
      },
      {
        label: "Purchase Orders",
        icon: ShoppingCart,
        href: "/inventory/purchase-orders",
        requiredPermission: "inventory:purchase-orders:read",
      },
      {
        label: "Sales Orders",
        icon: FileText,
        href: "/inventory/sales-orders",
        requiredPermission: "inventory:sales-orders:read",
      },
      {
        label: "Operations",
        icon: Activity,
        href: "/inventory/operations",
        requiredPermission: [
          "inventory:purchase-orders:read",
          "inventory:sales-orders:read",
        ],
      },
      {
        label: "Reports",
        icon: BarChart3,
        href: "/inventory/reports/stock-summary",
        requiredPermission: "inventory:reports:read",
        children: [
          {
            label: "Stock Summary",
            icon: BarChart2,
            href: "/inventory/reports/stock-summary",
            requiredPermission: "inventory:reports:read",
          },
          {
            label: "Movements",
            icon: ArrowLeftRight,
            href: "/inventory/reports/movements",
            requiredPermission: "inventory:reports:read",
          },
          {
            label: "Reorder",
            icon: RefreshCcw,
            href: "/inventory/reports/reorder",
            requiredPermission: "inventory:reports:read",
          },
          {
            label: "Slow Moving",
            icon: TrendingDown,
            href: "/inventory/reports/slow-moving",
            requiredPermission: "inventory:reports:read",
          },
          {
            label: "Expiry",
            icon: CalendarClock,
            href: "/inventory/reports/expiry",
            requiredPermission: "inventory:reports:read",
          },
          {
            label: "Operations SLA",
            icon: Gauge,
            href: "/inventory/reports/throughput",
            requiredPermission: "inventory:reports:read",
          },
          {
            label: "Audit Trail",
            icon: History,
            href: "/inventory/reports/audit-trail",
            requiredPermission: "inventory:audit:read",
          },
        ],
      },
      {
        label: "Quality",
        icon: ShieldCheck,
        href: "/inventory/quality",
        requiredPermission: "inventory:quality:read",
      },
      {
        label: "Shipments",
        icon: Package,
        href: "/inventory/shipments",
        requiredPermission: "inventory:shipments:manage",
        children: [
          {
            label: "Packages",
            icon: Container,
            href: "/inventory/packages",
            requiredPermission: "inventory:packages:manage",
          },
          {
            label: "Loads",
            icon: Boxes,
            href: "/inventory/loads",
            requiredPermission: "inventory:loads:manage",
          },
          {
            label: "Carriers",
            icon: Truck,
            href: "/inventory/carriers",
            requiredPermission: "inventory:shipments:manage",
          },
          {
            label: "3PL Connections",
            icon: Globe,
            href: "/inventory/3pl",
            requiredPermission: "inventory:3pl:manage",
          },
        ],
      },
      {
        label: "Traceability",
        icon: Scan,
        href: "/inventory/lots",
        requiredPermission: "inventory:stock:read",
        children: [
          {
            label: "Lots",
            icon: Boxes,
            href: "/inventory/lots",
            requiredPermission: "inventory:stock:read",
          },
          {
            label: "Serials",
            icon: PackageCheck,
            href: "/inventory/serials",
            requiredPermission: "inventory:stock:read",
          },
          {
            label: "Expiry",
            icon: CalendarClock,
            href: "/inventory/expiry",
            requiredPermission: "inventory:stock:read",
          },
          {
            label: "Cycle Counts",
            icon: RotateCcw,
            href: "/inventory/cycle-counts",
            requiredPermission: "inventory:stock:read",
          },
          {
            label: "Physical Audits",
            icon: ClipboardCheck,
            href: "/inventory/physical-audits",
            requiredPermission: "inventory:stock:read",
          },
        ],
      },
      {
        // C2/C5/C7. The group and its Replenishment child share an href, so the
        // parent has to require what that page requires — it used to ask for
        // `inventory:reports:read` while the page asks for
        // `inventory:replenishment:read`, which showed the entry to people who
        // then landed on NoPermissionState. A parent nobody may open is not a
        // dead end here: `filterRoute` promotes its accessible children instead
        // of hiding them, so a reports-only reader still reaches Forecasting,
        // Valuation, Costing and Reconciliation.
        label: "Planning",
        icon: TrendingUp,
        href: "/inventory/replenishment",
        requiredPermission: "inventory:replenishment:read",
        children: [
          {
            label: "Replenishment",
            icon: RefreshCcw,
            href: "/inventory/replenishment",
            requiredPermission: "inventory:replenishment:read",
          },
          {
            label: "Transfer recommendations",
            icon: ArrowLeftRight,
            href: "/inventory/replenishment/transfers",
            requiredPermission: "inventory:replenishment:read",
          },
          {
            label: "Forecast drift",
            icon: Activity,
            href: "/inventory/replenishment/drift",
            requiredPermission: "inventory:replenishment:read",
          },
          {
            label: "Forecasting",
            icon: BarChart2,
            href: "/inventory/forecasting",
            requiredPermission: "inventory:reports:read",
          },
          {
            label: "Valuation",
            icon: DollarSign,
            href: "/inventory/valuation",
            requiredPermission: "inventory:valuation:read",
          },
          {
            label: "Costing",
            icon: Calculator,
            href: "/inventory/costing",
            requiredPermission: "inventory:valuation:read",
          },
          {
            label: "Reconciliation",
            icon: Scale,
            href: "/inventory/reconciliation",
            requiredPermission: "inventory:stock:reconcile",
          },
        ],
      },
      {
        /**
         * F3/F6 — the AI surfaces, which had no entry at all before this: the
         * copilot was written, tested and mounted nowhere, and a page nobody can
         * navigate to has not shipped. Gated on the surfaces' own key rather
         * than on `inventory:stock:read`, because `inventory:ai:read` is exactly
         * what the pages behind it require — a parent that asks for less shows
         * the entry to people who then land on NoPermissionState.
         */
        label: "AI",
        icon: Sparkles,
        href: "/inventory/ai",
        requiredPermission: "inventory:ai:read",
      },
      {
        label: "Channels",
        icon: Globe,
        href: "/inventory/channels",
        requiredPermission: "inventory:channels:manage",
      },
      {
        label: "Quick commerce",
        icon: Globe,
        href: "/inventory/quick-commerce",
        requiredPermission: "inventory:channels:manage",
      },
      {
        label: "My tasks (RF)",
        icon: Scan,
        href: "/inventory/rf",
        requiredPermission: "inventory:stock:read",
      },
      {
        label: "Handling units",
        icon: Scan,
        href: "/inventory/handling-units",
        requiredPermission: "inventory:stock:read",
      },
      {
        label: "Barcode",
        icon: Scan,
        href: "/inventory/barcode",
        requiredPermission: "inventory:stock:read",
      },
      {
        label: "Import",
        icon: Upload,
        href: "/inventory/import",
        requiredPermission: "inventory:import",
      },
      {
        label: "Settings",
        icon: SlidersHorizontal,
        href: "/inventory/settings",
        requiredPermission: "inventory:settings:manage",
      },
      {
        label: "Access",
        icon: ShieldCheck,
        href: "/inventory/access",
        requiredPermission: "inventory:access:view",
      },
    ],
  },
];
