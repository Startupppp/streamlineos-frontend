import {
  BRAND_NAME,
  BRAND_TAGLINE,
  BRAND_DESCRIPTION,
  BRAND_URL,
  BRAND_SUPPORT_EMAIL,
} from "@/lib/branding";

/* ─────────────────────────────────────────────────────────────────────────────
   Structured data (Schema.org / JSON-LD) — helps Google understand the brand,
   product, FAQs, and breadcrumbs. Surfaces rich results (sitelinks, FAQ
   expansions, breadcrumbs) in search.
   ───────────────────────────────────────────────────────────────────────── */

type JsonLdProps<T> = { data: T };

function JsonLd<T>({ data }: JsonLdProps<T>) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: BRAND_NAME,
        legalName: BRAND_NAME,
        url: BRAND_URL,
        logo: `${BRAND_URL}/logo.svg`,
        description: BRAND_DESCRIPTION,
        foundingDate: "2026",
        slogan: BRAND_TAGLINE,
        contactPoint: [
          {
            "@type": "ContactPoint",
            email: BRAND_SUPPORT_EMAIL,
            contactType: "customer support",
            availableLanguage: ["en"],
          },
        ],
        sameAs: ["https://www.linkedin.com/company/streamline-os"],
      }}
    />
  );
}

export function WebsiteJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: BRAND_NAME,
        url: BRAND_URL,
        description: BRAND_DESCRIPTION,
        publisher: {
          "@type": "Organization",
          name: BRAND_NAME,
          logo: `${BRAND_URL}/logo.svg`,
        },
        potentialAction: {
          "@type": "SearchAction",
          target: `${BRAND_URL}/?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      }}
    />
  );
}

export function SoftwareApplicationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: BRAND_NAME,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "HR, Project Management, CRM",
        operatingSystem: "Web, Cloud",
        description: BRAND_DESCRIPTION,
        url: BRAND_URL,
        image: `${BRAND_URL}/logo.svg`,
        offers: [
          {
            "@type": "Offer",
            name: "Free",
            price: "0",
            priceCurrency: "INR",
            description: "Free forever for up to 3 seats.",
          },
          {
            "@type": "Offer",
            name: "Startup",
            price: "399",
            priceCurrency: "INR",
            description: "Per seat per month, billed annually. All apps included.",
          },
          {
            "@type": "Offer",
            name: "Growth",
            price: "639",
            priceCurrency: "INR",
            description: "Per seat per month, billed annually.",
          },
          {
            "@type": "Offer",
            name: "Enterprise",
            price: "1499",
            priceCurrency: "INR",
            description: "Starting price per seat per month, custom contracts.",
          },
        ],
        featureList: [
          "HR Management",
          "Payroll automation",
          "Attendance & leave tracking",
          "Project & sprint planning",
          "Kanban boards",
          "CRM & sales pipeline",
          "Real-time team chat",
          "Calendar & meetings",
          "AI assistance",
          "Role-based access control",
          "Multi-org / multi-branch",
        ],
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.9",
          ratingCount: "100",
          bestRating: "5",
          worstRating: "1",
        },
      }}
    />
  );
}

export function FAQJsonLd({
  faqs,
}: {
  faqs: { question: string; answer: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.answer,
          },
        })),
      }}
    />
  );
}

export function BlogPostingJsonLd({
  title,
  description,
  url,
  datePublished,
  authorName,
  image,
}: {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  authorName: string;
  image?: string;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: title,
        description,
        url,
        datePublished,
        dateModified: datePublished,
        author: {
          "@type": "Person",
          name: authorName,
        },
        publisher: {
          "@type": "Organization",
          name: BRAND_NAME,
          logo: {
            "@type": "ImageObject",
            url: `${BRAND_URL}/logo.svg`,
          },
        },
        image: image ?? `${BRAND_URL}/opengraph-image`,
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": url,
        },
      }}
    />
  );
}

export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  );
}
