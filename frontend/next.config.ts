import type { NextConfig } from "next";
import { BUILD_COMPAT_REDIRECTS } from "./lib/build/build-compat-redirects";

function isLocalOrLoopbackAppUrl(): boolean {
  for (const raw of [process.env.NEXTAUTH_URL]) {
    if (!raw) continue;
    try {
      const host = new URL(raw).hostname.toLowerCase();
      if (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "::1" ||
        host.endsWith(".localhost")
      )
        return true;
    } catch {
    }
  }
  return false;
}

function shouldSendStrictTransportSecurity(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  if (process.env.DISABLE_HSTS === "1") return false;
  if (isLocalOrLoopbackAppUrl()) return false;
  return true;
}

const optimizePackageImports = [
  "lucide-react",
  "recharts",
  "@hello-pangea/dnd",
  "date-fns",
  "framer-motion",
  "@radix-ui/react-dialog",
  "@radix-ui/react-select",
  "@radix-ui/react-dropdown-menu",
  "@radix-ui/react-popover",
  "@radix-ui/react-tooltip",
  "@radix-ui/react-tabs",
  "@radix-ui/react-alert-dialog",
  "@radix-ui/react-scroll-area",
  "@radix-ui/react-checkbox",
  "@radix-ui/react-radio-group",
  "@radix-ui/react-avatar",
];

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  turbopack: {},
  webpack(config, { dev }) {
    if (!dev) config.cache = false;
    return config;
  },
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  reactCompiler: true,
  experimental: {
    useTypeScriptCli: true,
    webpackBuildWorker: true,
    webpackMemoryOptimizations: true,
    optimizePackageImports,
    serverActions: {
      allowedOrigins: [
        ...(process.env.NODE_ENV === "development"
          ? ["*.devtunnels.ms", "*.vscode.dev"]
          : []),
        ...(() => {
          const urls = [process.env.NEXTAUTH_URL].filter(Boolean);
          const hosts = urls.flatMap((u) => {
            try {
              return [new URL(u!).host];
            } catch {
              return [];
            }
          });
          return hosts;
        })(),
      ],
    },
  },
  redirects: async () => [
    {
      source: "/inventory/pick-lists",
      destination: "/inventory/operations/picking",
      permanent: false,
    },
    {
      source: "/me",
      destination: "/dashboard",
      permanent: true,
    },
    { source: "/me/attendance", destination: "/me/workday", permanent: false },
    {
      source: "/me/time-off",
      destination: "/me/workday?section=time-off",
      permanent: false,
    },
    { source: "/me/documents", destination: "/me/records", permanent: false },
    {
      source: "/me/onboarding",
      destination: "/me/records?section=onboarding",
      permanent: false,
    },
    { source: "/me/expenses", destination: "/me/money", permanent: false },
    {
      source: "/me/pay",
      destination: "/me/money?section=pay",
      permanent: false,
    },
    { source: "/me/recruitment", destination: "/me/career", permanent: false },
    {
      source: "/me/job-openings",
      destination: "/me/career?section=openings",
      permanent: false,
    },
    {
      source: "/me/referrals",
      destination: "/me/career?section=referrals",
      permanent: false,
    },
    {
      source: "/signup",
      destination: "/signin",
      permanent: true,
    },
    {
      source: "/login",
      destination: "/signin",
      permanent: true,
    },
    {
      source: "/register",
      destination: "/signin",
      permanent: true,
    },
    {
      source: "/auth/login",
      destination: "/signin",
      permanent: true,
    },
    {
      source: "/auth/signin",
      destination: "/signin",
      permanent: true,
    },
    {
      source: "/auth/register",
      destination: "/signin",
      permanent: true,
    },
    {
      source: "/sign-in",
      destination: "/signin",
      permanent: true,
    },
    {
      source: "/chat/channels",
      destination: "/chat?search=channels",
      permanent: false,
    },
    {
      source: "/payroll/workers",
      destination: "/payroll/employees",
      permanent: false,
    },
    {
      source: "/hr/payroll",
      destination: "/payroll",
      permanent: false,
    },
    {
      source: "/hr/skills",
      destination: "/hr/employees/skills-matrix",
      permanent: false,
    },
    {
      source: "/hr/probation",
      destination: "/hr/onboarding/probation",
      permanent: false,
    },
    {
      source: "/hr/leave",
      destination: "/hr/leaves",
      permanent: false,
    },
    {
      source: "/hr/directory",
      destination: "/hr/employees",
      permanent: false,
    },
    {
      source: "/hr/policies",
      destination: "/hr/settings/policies",
      permanent: false,
    },
    {
      source: "/pay",
      destination: "/me/money?section=pay",
      permanent: false,
    },
    {
      source: "/demo",
      destination: "/contact",
      permanent: false,
    },
    {
      source: "/me/leave",
      destination: "/me/workday?section=time-off",
      permanent: false,
    },
    {
      source: "/expenses",
      destination: "/me/money",
      permanent: false,
    },
    {
      source: "/hr/people",
      destination: "/hr/employees",
      permanent: false,
    },
    {
      source: "/hr/time-clocks",
      destination: "/hr/devices",
      permanent: false,
    },
    {
      source: "/hr/support",
      destination: "/hr/helpdesk",
      permanent: false,
    },
    {
      source: "/hr/compensation",
      destination: "/hr/compensation-planning",
      permanent: false,
    },
    {
      source: "/hr/doc-types",
      destination: "/hr/document-types",
      permanent: false,
    },
    {
      source: "/hr/doc-review",
      destination: "/hr/document-review",
      permanent: false,
    },
    {
      source: "/hr/payroll/salary-structures",
      destination: "/payroll/salary-structures",
      permanent: false,
    },

    {
      source: "/hr/recruitment",
      destination: "/recruitment",
      permanent: true,
    },
    {
      source: "/hr/recruitment/:path*",
      destination: "/recruitment/:path*",
      permanent: true,
    },
    {
      source: "/hr/configuration",
      destination: "/hr/settings",
      permanent: false,
    },
    {
      source: "/hrms",
      destination: "/hr",
      permanent: false,
    },
    {
      source: "/hr/dashboard",
      destination: "/hr",
      permanent: false,
    },
    {
      source: "/hr/settings/company",
      destination: "/settings/organization",
      permanent: false,
    },
    {
      source: "/hr/settings/managers",
      destination: "/hr/settings/reporting-managers",
      permanent: true,
    },
    {
      source: "/build/:projectId(\\d+)",
      has: [{ type: "query", key: "view", value: "workload" }],
      destination: "/build/:projectId/workload",
      permanent: false,
    },
    {
      source: "/knowledge/wiki/pages/:pageId",
      destination: "/knowledge/wiki/doc/:pageId",
      permanent: false,
    },
    {
      source: "/knowledge/wiki/pages/:pageId/history",
      destination: "/knowledge/wiki/doc/:pageId/history",
      permanent: false,
    },
    {
      source: "/build/:projectId(\\d+)/timeline",
      destination: "/build/:projectId/issues?view=timeline",
      permanent: false,
    },
    {
      source: "/build/:projectId(\\d+)/gantt",
      destination: "/build/:projectId/issues?view=timeline",
      permanent: false,
    },
    {
      source: "/build/:projectId(\\d+)/roadmap",
      destination: "/build/:projectId/milestones",
      permanent: false,
    },
    {
      source: "/build/:projectId(\\d+)/bugs",
      destination: "/build/:projectId/issues?type=BUG",
      permanent: false,
    },
    {
      source: "/build/:projectId(\\d+)/analytics",
      destination: "/build/:projectId/reports?tab=overview",
      permanent: false,
    },
    {
      source: "/build/:projectId(\\d+)/views",
      destination: "/build/:projectId/issues",
      permanent: false,
    },
    {
      source: "/build/:projectId(\\d+)/ai",
      destination: "/build/command-center?projectId=:projectId",
      permanent: false,
    },
    {
      source: "/build/:projectId(\\d+)/workflow",
      destination: "/build/:projectId/settings/workflow",
      permanent: false,
    },
    {
      source: "/build/:projectId(\\d+)/automations",
      destination: "/build/:projectId/settings/automations",
      permanent: false,
    },
    {
      source: "/build/:projectId(\\d+)/webhooks",
      destination: "/build/:projectId/settings/integrations/webhooks",
      permanent: false,
    },
    {
      source: "/build/:projectId(\\d+)/sprints",
      destination: "/build/:projectId/cycles",
      permanent: false,
    },
    {
      source: "/build/goal",
      destination: "/build/goals",
      permanent: false,
    },
    {
      source: "/build/goal/:goalId(\\d+)",
      destination: "/build/goals/:goalId",
      permanent: false,
    },
    {
      source: "/build/pm-workspaces",
      destination: "/build/projects",
      permanent: false,
    },
    {
      source: "/build/customers",
      destination: "/crm",
      permanent: false,
    },
    {
      source: "/settings/members",
      destination: "/settings/users",
      permanent: false,
    },
    {
      source: "/build/members",
      destination: "/build/settings/access",
      permanent: false,
    },
    {
      source: "/build/access",
      destination: "/build/settings/access",
      permanent: false,
    },
    {
      source: "/build/client-access",
      destination: "/build/settings/client-access",
      permanent: false,
    },
    ...BUILD_COMPAT_REDIRECTS,
    {
      source: "/build/:projectId(\\d+)/my-tickets",
      destination: "/build/my-work?projectId=:projectId",
      permanent: false,
    },
    {
      source: "/build/workspaces/:pmWorkspaceId/my-work",
      destination: "/build/my-work",
      permanent: false,
    },
    {
      source: "/build/workspaces/:pmWorkspaceId/overview",
      destination: "/build/command-center",
      permanent: false,
    },
    {
      source: "/build/workspaces/:pmWorkspaceId/all-work",
      destination: "/build/all-work",
      permanent: false,
    },
    {
      source: "/build/workspaces/:pmWorkspaceId/goals",
      destination: "/build/goals",
      permanent: false,
    },
    {
      source: "/build/workspaces/:pmWorkspaceId/products",
      destination: "/build/managed-products",
      permanent: false,
    },
    {
      source: "/build/workspaces/:pmWorkspaceId/roadmap",
      destination: "/build/roadmap",
      permanent: false,
    },
    {
      source: "/build/workspaces/:pmWorkspaceId/teams",
      destination: "/build/teams",
      permanent: false,
    },
    {
      source: "/build/workspaces/:pmWorkspaceId",
      destination: "/build/projects",
      permanent: false,
    },
    {
      source: "/build/workspaces",
      destination: "/build/projects",
      permanent: false,
    },
    {
      source: "/home",
      destination: "/dashboard",
      permanent: false,
    },
    {
      source: "/notifications",
      destination: "/inbox?view=notifications",
      permanent: false,
    },
    {
      source: "/notifications/preferences",
      destination: "/settings/notifications/my-preferences",
      permanent: false,
    },
    {
      source: "/notifications/templates",
      destination: "/settings/notifications/templates",
      permanent: false,
    },
    {
      source: "/notifications/broadcasts",
      destination: "/settings/notifications/broadcasts",
      permanent: false,
    },
    {
      source: "/notifications/providers",
      destination: "/settings/notifications/providers",
      permanent: false,
    },
    {
      source: "/notifications/events",
      destination: "/settings/notifications/events",
      permanent: false,
    },
    {
      source: "/notifications/policy",
      destination: "/settings/notifications/policy",
      permanent: false,
    },
    {
      source: "/settings/notifications",
      destination: "/settings/notifications/my-preferences",
      permanent: false,
    },
    {
      source: "/announcements",
      destination: "/hr/announcements",
      permanent: false,
    },
    {
      source: "/chat/settings",
      destination: "/chat",
      permanent: false,
    },
    {
      source: "/docs",
      destination: "/knowledge/wiki",
      permanent: false,
    },
    {
      source: "/kb",
      destination: "/knowledge/wiki",
      permanent: false,
    },
    {
      source: "/ask",
      destination: "/knowledge/chat",
      permanent: false,
    },
  ],
  images: {
    formats: ["image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "streamlineos.app",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  rewrites: async () => {
    const api = (
      process.env.API_INTERNAL_URL?.trim() ||
      process.env.NEXT_PUBLIC_API_URL ||
      ""
    ).replace(/\/$/, "");
    return api
      ? [{ source: "/blogs/rss.xml", destination: `${api}/blog/rss.xml` }]
      : [];
  },
  headers: async () => [
    {
      source: "/:asset(logo.svg|logo-email.svg|bimi-logo.svg)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=86400, stale-while-revalidate=604800",
        },
      ],
    },
    {
      source: "/feedbucket-widget.js",
      headers: [
        {
          key: "Cache-Control",
          value: "no-cache, must-revalidate",
        },
      ],
    },
    {
      source: "/:dir(illustrations|icons)/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=604800, stale-while-revalidate=2592000",
        },
      ],
    },
    {
      source: "/(.*)",
      headers: [
        { key: "Accept-CH", value: "Sec-CH-UA-Mobile" },
        { key: "Vary", value: "Sec-CH-UA-Mobile, User-Agent" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(self), microphone=(self), geolocation=(self)",
        },
        ...(shouldSendStrictTransportSecurity()
          ? [
              {
                key: "Strict-Transport-Security",
                value: "max-age=63072000; includeSubDomains; preload",
              },
            ]
          : []),
        { key: "X-XSS-Protection", value: "0" },
        {
          key: "Cross-Origin-Opener-Policy",
          value: "same-origin-allow-popups",
        },
        { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
      ],
    },
  ],
};

export default nextConfig;
