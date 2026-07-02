import type { MetadataRoute } from "next";
import { BRAND_URL } from "@/lib/branding";

export default function robots(): MetadataRoute.Robots {
  const base = BRAND_URL.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/blogs", "/pricing", "/contact", "/signin", "/signup", "/legal/"],
        disallow: [
          "/api/",
          "/dashboard/",
          "/hr/",
          "/projects/",
          "/crm/",
          "/sales/",
          "/marketing/",
          "/customer-executive/",
          "/billing/",
          "/timesheets/",
          "/onboarding/",
          "/settings/",
          "/support/",
          "/ceo/",
          "/notifications/",
          "/reports/",
          "/calendar/",
          "/chat/",
          "/ai/",
          "/account-deactivated/",
          "/setup-password",
          "/reset-password",
          "/forgot-password",
          "/verify-email",
          "/invitation/",
          "/interview-booking/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
