import type { NextConfig } from "next";

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
      // ignore invalid URL
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

const optimizePackageImports =
  process.env.NODE_ENV === "production"
    ? [
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
      ]
    : ["lucide-react"];

const nextConfig: NextConfig = {
  /**
   * A second dev server on this working tree needs its own build directory.
   *
   * `next dev` writes a lock into `<distDir>/dev/lock` and refuses to start when
   * one is already there, which is correct — two servers sharing one `.next`
   * corrupt each other's output. Two people (or two agent sessions) working on
   * the same checkout still need to run one each, so the directory is
   * overridable: `NEXT_DIST_DIR=.next-local npx next dev -p 1002`.
   *
   * Unset in every normal case, so CI, Vercel and `pnpm dev` all keep writing
   * `.next` exactly as before.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",
  turbopack: {},
  webpack(config, { dev }) {
    if (!dev) config.cache = false;
    return config;
  },
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  experimental: {
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
      source: "/signup",
      destination: "/signin",
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
  headers: async () => [
    {
      source:
        "/:asset(logo.svg|logo-email.svg|bimi-logo.svg|feedbucket-widget.js)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=86400, stale-while-revalidate=604800",
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
        /**
         * Advertise that we select the shell variant from Sec-CH-UA-Mobile so
         * the browser sends it on the next navigation.  Caches must vary on it
         * (and User-Agent for the UA fallback path) so they never serve the
         * mobile shell to a desktop or vice-versa.  The Vary header on static
         * _next/static/** assets is harmless — those URLs are content-addressed
         * and served Cache-Control: immutable, so no proxy varies their cache
         * by this header in practice.
         */
        { key: "Accept-CH", value: "Sec-CH-UA-Mobile" },
        { key: "Vary", value: "Sec-CH-UA-Mobile, User-Agent" },
        { key: "X-Frame-Options", value: "DENY" },
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
