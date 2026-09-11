
// analytics.ts
patch('hooks/api/crm/analytics.ts',
`import { lazyContract } from "@/lib/api-envelope";
const supportDashboardLazy = lazyContract(() => import("@/hooks/api/crm/analytics-schema").then((m) => m.supportDashboardContract));
const salesKpisLazy = lazyContract(() => import("@/hooks/api/crm/analytics-schema").then((m) => m.salesKpisContract));
const revenueVsGoalLazy = lazyContract(() => import("@/hooks/api/crm/analytics-schema").then((m) => m.revenueVsGoalContract));`,
  [
    ['apiClient.get<SupportDashboard>("/crm/support-dashboard", undefined, signal)', 'apiClient.get<SupportDashboard>("/crm/support-dashboard", undefined, signal, supportDashboardLazy)'],
    ['apiClient.get<SalesDashboardKPIsResult>("/sales/dashboard/kpis", params, signal)', 'apiClient.get<SalesDashboardKPIsResult>("/sales/dashboard/kpis", params, signal, salesKpisLazy)'],
  ]
);
