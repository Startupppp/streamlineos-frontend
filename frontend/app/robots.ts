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
          "/ask/",
          "/billing/",
          "/calendar/",
          "/chat/",
          "/crm/",
          "/dashboard/",
          "/hr/",
          "/inventory/",
          "/knowledge/",
          "/knowledge-base/",
          "/notifications/",
          "/onboarding/",
          "/organization/",
          "/payroll/",
          "/projects/",
          "/settings/",
          "/sign/",
          "/signin",
          "/signup",
          "/support/",
          "/surveys/",
          "/timesheets/",
          "/users/",
          "/workflows/",
          "/sales/",
          "/marketing/",
          "/customer-executive/",
          "/ceo/",
          "/reports/",
          "/account-deactivated/",
          "/verify-email",
          "/invitation/",
          "/interview-booking/",
          "/magic-link",
          "/access-denied",
          "/subscription-expired",
          "/org-setup",
          "/owner",
          "/post-signin",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
