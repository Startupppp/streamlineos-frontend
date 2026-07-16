type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  tag: string;
  publishedAt: string;
  readingMinutes: number;
  author: { name: string; role: string };
  content: string;
};

const posts: BlogPost[] = [
  {
    slug: "why-we-built-streamlineos",
    title: "Why we built StreamlineOS",
    excerpt:
      "Most growing teams in India run on a Frankenstein stack — HR in one tool, deals in another, projects in a third, chat scattered across four apps. StreamlineOS is our attempt to fix that with one data model.",
    tag: "Founder note",
    publishedAt: "2026-06-10",
    readingMinutes: 6,
    author: { name: "Aditya Challa", role: "Founder" },
    content: `## The problem we kept seeing

Talk to any 20-to-200-person team in India and the operating stack looks identical: Keka or GreytHR for HR, Zoho or HubSpot for CRM, ClickUp or Asana for projects, Slack for chat, Razorpay for billing, Google Workspace for docs, and a graveyard of spreadsheets stitching them together.

The math works out to roughly **₹18,000 to ₹40,000 per employee per year** in seat licenses alone — before anyone has done the work of making those tools agree on who an employee actually is, or whether a candidate, a contractor, and a customer-success owner are the same person.

The deeper problem isn't cost. It's that the **data model is fractured**. An employee record in Keka is a different object than the same person's owner field on a HubSpot deal, which is different again from their @company.com identity in Slack. Every integration is a translation layer. Every report is a join across three SaaS APIs done by hand in a Google Sheet on the last Friday of the month.

We built StreamlineOS because we believe small teams shouldn't have to glue together five SaaS products to know what's happening in their own company.

## The thesis

A modern operating system for a company should do for business workflows what an OS does for a computer: provide one identity layer, one permissions model, one notification system, one audit log — and let every "app" run on top of that shared substrate.

For us, the substrate is:

- **One identity** — an employee, candidate, customer, partner, and dashboard user are all rows in the same identity graph, with role-aware projections per module.
- **One permissions model** — role-based access control that's set once at the org level and respected by every module (HR, CRM, Projects, Chat, Calendar) without re-implementing it three times.
- **One activity feed** — a deal moves, a leave is approved, a sprint ticket is closed, a payslip is generated — all of it streams to one place, with one notifications system.
- **One bill** — one platform, one invoice, one contract. Not eight renewal cycles.

That's the bet. The product is the proof.

## What's different about how it's built

Three architectural choices we made early that we think matter:

**1. Drizzle + Postgres, not Prisma + Mongo + sidecars.**
StreamlineOS is one Postgres database with a normalized, typed schema. Every join across HR, CRM, and Projects is a real SQL join — not an API stitch. This means dashboards stay fast as you scale, and reports that traditionally take 3 days to build in a BI tool take 3 hours in our internal query layer.

**2. Server actions everywhere, not REST + GraphQL + tRPC + Webhooks.**
We use Next.js server actions as the primary mutation surface. There's exactly one place a "create lead" goes: a typed server function with zod validation. That function fires the right notifications, writes the audit log, and revalidates the dashboard cache. No client-side mutation libraries to keep in sync.

**3. RBAC + multi-org from day one.**
Most SaaS bolts on multi-tenancy three years in and breaks. We started with two scoping axes: organization (for multi-entity holding companies) and role (for what each user sees within an org). Every query is scoped through this twice. It's slower to build features this way at first — and dramatically faster to ship enterprise readiness later.

## What we shipped first

The launch surface area is intentionally narrow:

- **Platform owner suite** — dashboard, inbox, leads, customers, visitors, revenue (Razorpay), support.
- **Authentication** — Google + credentials, with platform-owner role split from regular users.
- **Marketing site** — landing, about, blog, contact, legal (privacy/terms/security).
- **R2-backed file storage** — avatars, blog images, candidate documents, payslips, exports, all in one bucket with proper folder taxonomy.
- **Email** — Resend with SendGrid fallback, all transactional flows (contact replies, auto-responses).

The HR/CRM/Projects modules are deeper in the codebase but gated behind the org-level setup flow — we'll roll those out as the first customer cohort comes online.

## What's hard

Two things we've learned not to underestimate:

**Schema migrations are forever.** Once a customer's data is in your tables, you don't get to rename columns casually. We've already had to undo and re-design two table relationships before launch because we got the cardinality wrong. The cost of getting it wrong scales linearly with how long you wait.

**SEO for a brand-new domain is a slog.** Even with perfect technical SEO — sitemap, robots, structured data, canonical tags, Core Web Vitals — Google still puts brand-new domains in a "sandbox" for several weeks. You earn ranking through consistent publishing and real backlinks, not by tweaking meta tags. This blog is part of that work.

## What's next

Over the next 90 days we're focused on three things:

1. **Get the first 10 paying customers** — primarily 30-to-100-person Indian SaaS companies, agencies, and consultancies. The product fits them best.
2. **Open the HR + Projects + CRM modules** in sequence, validated with real customer workflows rather than feature checklists.
3. **Build the integration surface** — Razorpay (done), Google Workspace (in progress), Slack, WhatsApp Business, Zapier.

If you're building a team operating system or running one, I'd love to compare notes. Reach out at [founders@streamlineos.in](mailto:founders@streamlineos.in) or via the [contact page](/contact).

— Aditya`,
  },
];

export function getAllPosts(): BlogPost[] {
  return [...posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}
