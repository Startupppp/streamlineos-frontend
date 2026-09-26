import type { MetadataRoute } from "next";
import { BRAND_URL } from "@/lib/branding";

export default function robots(): MetadataRoute.Robots {
  const base = BRAND_URL.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/blogs", "/pricing", "/contact", "/legal/"],
        disallow: [
          "/api/",
          "/accounting/",
          "/billing/",
          "/calendar/",
          "/chat/",
          "/crm/",
          "/dashboard/",
          "/hr/",
          "/inventory/",
          "/knowledge/",
          "/notifications/",
          "/onboarding/",
          "/employee-onboarding/",
          "/organization/",
          "/payroll/",
          "/recruitment/",
          "/build/",
          "/settings/",
          "/sign/",
          "/signin",
          "/signup",
          "/support/",
          "/surveys/",
          "/timesheets/",
          "/users/",
          "/workflows/",
          "/verify-email",
          "/invitation/",
          "/interview-booking/",
          "/magic-link",
          "/access-denied",
          "/org-setup",
          "/owner",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
