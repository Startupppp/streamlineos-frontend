import type { Metadata } from "next";

import "../globals.css";
import { Toaster } from "../components/ui/sonner";
import { SessionProvider } from "../components/providers/session-provider";
import { ThemeProvider } from "../components/theme-provider";
import { MotionProvider } from "../components/providers/motion-provider";

import { Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Vaivamm Capital CRM",
    template: "%s | Vaivamm Capital CRM",
  },
  description: "Advanced HR, Project Management, and CRM platform for modern teams.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://crm.vaivammcapital.com"),
  openGraph: {
    type: "website",
    siteName: "Vaivamm Capital CRM",
    title: "Vaivamm Capital CRM",
    description: "Advanced HR, Project Management, and CRM platform for modern teams.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${playfair.variable} ${jetbrains.variable} font-sans min-h-screen bg-background text-foreground antialiased selection:bg-gold/30 selection:text-gold noir-grain`}
      >
        <ThemeProvider
            attribute="class"
            defaultTheme="light"
            forcedTheme="light"
            disableTransitionOnChange
          >
          <SessionProvider>
            <MotionProvider>
     {children}
            </MotionProvider>
            <Toaster position="top-right" />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
