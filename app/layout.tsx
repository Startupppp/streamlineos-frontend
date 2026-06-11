import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "../globals.css";
import { Toaster } from "../components/ui/sonner";
import { SessionProvider } from "../components/providers/session-provider";
import { ThemeProvider } from "../components/theme-provider";
import { MotionProvider } from "../components/providers/motion-provider";
import { QueryProvider } from "../components/providers/query-provider";
import {
  BRAND_NAME,
  BRAND_TAGLINE,
  BRAND_DESCRIPTION,
  BRAND_URL,
} from "../lib/branding";
import {
  OrganizationJsonLd,
  WebsiteJsonLd,
} from "@/features/seo/structured-data";
import {
  GoogleTagManagerHead,
  GoogleTagManagerNoscript,
} from "@/features/analytics/google-tag-manager";
import { MicrosoftClarity } from "@/features/analytics/clarity";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
  weight: ["400", "500", "600", "700"],
});

const SITE_URL = new URL(process.env.NEXT_PUBLIC_APP_URL || BRAND_URL);

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: {
    default: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    template: `%s · ${BRAND_NAME}`,
  },
  description: BRAND_DESCRIPTION,
  keywords: [
    "HR software India",
    "all in one HR platform",
    "CRM software",
    "project management software",
    "sales pipeline tool",
    "employee management system",
    "payroll software India",
    "attendance tracking software",
    "team operating system",
    "StreamlineOS",
    "HRMS",
    "people operations",
    "applicant tracking system",
  ],
  authors: [{ name: BRAND_NAME, url: BRAND_URL }],
  creator: BRAND_NAME,
  publisher: BRAND_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  applicationName: BRAND_NAME,
  category: "business",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: BRAND_URL,
    siteName: BRAND_NAME,
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: BRAND_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: BRAND_DESCRIPTION,
    creator: "@streamlineos",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  manifest: "/manifest.webmanifest",
  other: {
    "msapplication-TileColor": "#3b82f6",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef3fb" },
    { media: "(prefers-color-scheme: dark)", color: "#03060f" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable}`}
    >
      <head>
        <OrganizationJsonLd />
        <WebsiteJsonLd />
        <GoogleTagManagerHead />
      </head>
      <body className="font-sans min-h-screen bg-background text-foreground antialiased selection:bg-blue-500/20 selection:text-blue-950">
        <GoogleTagManagerNoscript />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          disableTransitionOnChange
        >
          <SessionProvider>
            <QueryProvider>
              <MotionProvider>{children}</MotionProvider>
              <Toaster position="top-right" richColors />
            </QueryProvider>
          </SessionProvider>
        </ThemeProvider>
        <MicrosoftClarity />
      </body>
    </html>
  );
}
