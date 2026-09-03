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

function apiConnectOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "";
  }
}

export function buildContentSecurityPolicy(): string {
  const isDev = process.env.NODE_ENV === "development";
  const scriptSrc = [
    "'self'",
    ...(isDev ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
    "https://accounts.google.com",
    "https://checkout.razorpay.com",
  ].join(" ");
  const apiOrigin = apiConnectOrigin();
  const connectSrc = [
    "'self'",
    "https://accounts.google.com",
    "https://*.upstash.io",
    "https://*.r2.dev",
    "https://*.r2.cloudflarestorage.com",
    /**
     * Ably, kept in step with proxy.ts's `buildCsp` — see the reasoning there.
     * `wss://` used to stand here, which is not a source expression at all
     * (`scheme-source` is `wss:`, `host-source` needs a host after `://`), so a
     * browser dropped it and this policy allowed no WebSocket either.
     */
    "https://*.realtime.ably.net",
    "wss://*.realtime.ably.net",
    "https://*.fallback.ably-realtime.com",
    "wss://*.fallback.ably-realtime.com",
    "https://internet-up.ably-realtime.com",
    "wss://ws-up.ably-realtime.com",
    "https://api.razorpay.com",
    "https://checkout.razorpay.com",
    ...(apiOrigin ? [apiOrigin] : []),
  ].join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://api.dicebear.com https://*.r2.dev https://*.r2.cloudflarestorage.com https://images.unsplash.com https://lh3.googleusercontent.com https://streamlineos.app",
    `connect-src ${connectSrc}`,
    "worker-src 'self' blob:",
    "frame-src 'self' https://accounts.google.com https://checkout.razorpay.com https://api.razorpay.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
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
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports,
    serverActions: {
      allowedOrigins: [
        ...(process.env.NODE_ENV === "development" ? ["*.devtunnels.ms", "*.vscode.dev"] : []),
        ...(() => {
          const urls = [process.env.NEXTAUTH_URL].filter(Boolean);
          const hosts = urls.flatMap((u) => {
            try { return [new URL(u!).host]; } catch { return []; }
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
      source: "/build/:projectId/workload",
      destination: "/build/:projectId?view=workload",
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
      source: "/:asset(logo.svg|logo-email.svg|bimi-logo.svg|feedbucket-widget.js)",
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
        {
          key: "Content-Security-Policy",
          value: buildContentSecurityPolicy(),
        },
      ],
    },
  ],
};

export default nextConfig;
