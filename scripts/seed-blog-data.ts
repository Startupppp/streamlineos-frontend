import { BRAND_NAME } from "../lib/branding";
import { buildHtml, coverUrl, PostSeed } from "./seed-blog-utils";
import { POSTS_EXT } from "./seed-blog-posts-ext";

export { calcReadingTime, slugify } from "../lib/blog-utils";
export { buildHtml, PostSeed } from "./seed-blog-utils";

const cover = coverUrl;

export const AUTHORS = [
  {
    name: BRAND_NAME,
    email: "blog@streamlineos.app",
    avatar: "/logo.svg",
    bio: null as string | null,
    role: null as string | null,
    twitter: null as string | null,
    linkedin: null as string | null,
  },
];

export const CATEGORIES = [
  { name: "Technology", color: "#3B82F6", description: "Architecture, tooling, and the tech that powers modern teams." },
  { name: "Design", color: "#8B5CF6", description: "Product design, accessibility, and craft." },
  { name: "Business", color: "#10B981", description: "Company building, operations, and leadership." },
  { name: "Marketing", color: "#F59E0B", description: "Growth, content, and reaching the right people." },
  { name: "Engineering", color: "#EF4444", description: "Deep dives on how we build and scale." },
];

export interface PostSeed {
  title: string;
  category: string;
  cover: string;
  tags: string[];
  featured?: boolean;
  status: "published" | "draft";
  excerpt: string;
  content: string;
}

const POSTS_CORE: PostSeed[] = [
  {
    title: "Building a Unified Operating System for Modern Teams",
    category: "Business",
    cover: cover("1522071820081-009f0129c71c"),
    tags: ["operations", "company-building", "productivity", "tools"],
    featured: true,
    status: "published",
    excerpt:
      "Most teams run on a dozen disconnected tools. Here is why we believe the future is a single operating system - and how we are building one.",
    content: buildHtml(
      [
        "The average growing company runs on more than a hundred SaaS tools. Each one solves a real problem, but together they create a new one: context is scattered, data is duplicated, and people spend their days copying information between tabs.",
        "We started StreamlineOS with a simple conviction - that a company should feel like one product, not a patchwork of integrations stitched together with brittle automations.",
      ],
      [
        {
          h2: "The cost of fragmentation",
          body: [
            "When your HR system, your project tracker, and your CRM all live in different places, the seams show up everywhere. Onboarding a new hire means touching five systems. Reporting means exporting four spreadsheets and reconciling them by hand.",
            "Fragmentation is not just an inconvenience. It is a tax on every decision, because the data you need is never in one place when you need it.",
          ],
          list: [
            "Duplicate records that drift out of sync",
            "Permissions managed separately in every tool",
            "No single source of truth for who is doing what",
          ],
        },
        {
          h2: "What a unified system unlocks",
          body: [
            "When HR, projects, CRM, and chat share the same data model, something interesting happens: workflows that used to span tools collapse into a single step. Assigning a project automatically reflects in capacity planning. Closing a deal updates revenue dashboards instantly.",
            "The goal is not to build every feature ourselves. It is to make the connections between features feel native, so the whole is genuinely greater than the sum of its parts.",
          ],
          quote:
            "The best tool is the one you stop noticing, because it gets out of the way and lets the work flow.",
        },
        {
          h2: "How we are getting there",
          body: [
            "We build module by module, but always on one shared foundation: one identity system, one permission model, one notification layer. Each new module inherits that foundation instead of reinventing it.",
            "It is slower in the short term and far faster in the long term. Every module we ship makes the next one cheaper to build and more powerful to use.",
          ],
        },
      ],
    ),
  },
  {
    title: "How We Cut Our Page Load Times in Half",
    category: "Engineering",
    cover: cover("1498050108023-c5249f4df085"),
    tags: ["performance", "nextjs", "web", "optimization"],
    featured: true,
    status: "published",
    excerpt:
      "A practical walkthrough of the changes that took our median page load from 2.1s to under a second - without rewriting the app.",
    content: buildHtml(
      [
        "Performance is a feature. Slow software feels broken even when every button works, and it quietly erodes trust over thousands of tiny interactions.",
        "Over one quarter we took our median page load from 2.1 seconds to 940 milliseconds. None of it required a rewrite - just disciplined measurement and a handful of high-leverage changes.",
      ],
      [
        {
          h2: "Measure before you optimize",
          body: [
            "We started by instrumenting real user metrics, not lab numbers. The lab tells you what is possible; real users tell you what is actually happening on mid-range phones and flaky networks.",
            "The data was humbling. Our worst pages were not the complex dashboards we worried about - they were simple list views shipping far too much JavaScript.",
          ],
        },
        {
          h2: "Move work to the server",
          body: [
            "The single biggest win was rendering more on the server and shipping less to the client. Server components let us keep data fetching close to the database and send finished HTML instead of a bundle that fetches on mount.",
            "Where we did need interactivity, we isolated it into small client islands rather than hydrating entire pages.",
          ],
          code: "// Before: a client component fetched on mount\n// After: a server component renders with data already resolved\nexport default async function Page() {\n  const posts = await getPublishedPosts({ limit: 9 });\n  return <PostGrid posts={posts} />;\n}",
        },
        {
          h2: "Right-size your images",
          body: [
            "Images were our second-biggest payload. Serving correctly sized, modern formats with explicit dimensions removed layout shift and cut megabytes from every page.",
            "A blur placeholder during load made the experience feel instant even when the network was not.",
          ],
          list: [
            "Always set width and height to avoid layout shift",
            "Lazy-load anything below the fold",
            "Serve modern formats and responsive sizes",
          ],
        },
      ],
    ),
  },
  {
    title: "The Design Principles Behind StreamlineOS",
    category: "Design",
    cover: cover("1531403009284-440f080d1e12"),
    tags: ["design", "principles", "ux", "craft"],
    status: "published",
    excerpt:
      "Good design is invisible. These are the principles we return to whenever we are unsure how something should look or behave.",
    content: buildHtml(
      [
        "Design principles are only useful if they help you make decisions. Vague values like \"delightful\" or \"intuitive\" sound nice but settle no arguments.",
        "Ours are deliberately opinionated, because opinions are what let a small team move quickly and stay consistent.",
      ],
      [
        {
          h2: "Clarity over cleverness",
          body: [
            "When a clever interaction competes with an obvious one, the obvious one wins. People do not come to work software to be impressed; they come to get something done.",
            "We reserve novelty for moments that genuinely benefit from it, and keep everything else calm and predictable.",
          ],
        },
        {
          h2: "Default to the data",
          body: [
            "Empty states, loading states, and error states are not edge cases - they are most of the experience for a new user. We design them first, not last.",
            "A thoughtful empty state teaches people what to do next. A thoughtless one leaves them stuck.",
          ],
          quote: "If the happy path is the only path you designed, you have only designed half the product.",
        },
        {
          h2: "Respect the reader",
          body: [
            "Typography, spacing, and contrast are not decoration. They determine whether someone can comfortably scan a dense table at the end of a long day.",
            "We hold ourselves to real accessibility standards because legibility is not a nice-to-have - it is the product working for everyone.",
          ],
        },
      ],
    ),
  },
  {
    title: "A Practical Guide to Role-Based Access Control",
    category: "Technology",
    cover: cover("1517694712202-14dd9538aa97"),
    tags: ["security", "rbac", "permissions", "architecture"],
    status: "published",
    excerpt:
      "RBAC sounds simple until you ship it. Here is a pragmatic model that scales from five users to five thousand without becoming a tangle.",
    content: buildHtml(
      [
        "Access control is one of those problems that looks trivial on a whiteboard and turns into a swamp in production. The trick is to keep the model small and the rules explicit.",
        "This is the approach we use to keep permissions understandable as the product grows.",
      ],
      [
        {
          h2: "Roles, not individuals",
          body: [
            "Assign permissions to roles and roles to people. When someone changes teams, you change their role - not a dozen individual grants scattered across the system.",
            "A handful of well-named roles covers the vast majority of real-world needs.",
          ],
          list: [
            "Roles map to jobs people actually do",
            "Permissions map to actions on resources",
            "People inherit permissions only through roles",
          ],
        },
        {
          h2: "Make the default deny",
          body: [
            "Every check should start from \"no\" and grant access only when a rule explicitly allows it. Fail-open systems are how data leaks happen.",
            "Defense in depth matters too: enforce access at the route layer and again at the data layer, so a missed check in one place is caught in another.",
          ],
          code: "function canAccess(role, route) {\n  if (role === 'CEO') return true; // explicit super-role\n  const allowed = ROUTE_ROLE_MAP[route] ?? [];\n  return allowed.includes(role); // default deny\n}",
        },
        {
          h2: "Plan for exceptions",
          body: [
            "Real organizations always have edge cases - the contractor who needs one extra view, the manager covering for a peer. Allow per-user overrides on top of roles, but log them so they do not become permanent mysteries.",
            "The goal is a system that is strict by default and humane at the edges.",
          ],
        },
      ],
    ),
  },
  {
    title: "Why Async Communication Wins for Distributed Teams",
    category: "Business",
    cover: cover("1556761175-5973dc0f32e7"),
    tags: ["remote", "communication", "culture", "productivity"],
    status: "published",
    excerpt:
      "Meetings feel productive and often are not. A bias toward writing makes distributed teams faster, fairer, and far less exhausted.",
    content: buildHtml(
      [
        "When your team spans time zones, the default of \"let's hop on a call\" quietly breaks down. Someone is always inconvenienced, and the people on the call are rarely the ones who needed to be there.",
        "Async communication is not about never talking. It is about defaulting to writing and reserving live time for the conversations that truly need it.",
      ],
      [
        {
          h2: "Writing forces clarity",
          body: [
            "A vague idea survives a meeting. It does not survive being written down. The act of writing a proposal exposes the gaps in your thinking before you ship them.",
            "Written decisions are also searchable, which means the answer to \"why did we do this?\" is one query away six months later.",
          ],
          quote: "If it is important, write it down. If it is not important enough to write down, it is probably not important.",
        },
        {
          h2: "Respect deep work",
          body: [
            "Every unplanned interruption costs far more than the minutes it takes. Async lets people batch communication and protect long stretches of focus.",
            "The best engineering and design happens in uninterrupted blocks, not between back-to-back calls.",
          ],
        },
        {
          h2: "When to go live",
          body: [
            "Async is the default, not a religion. Sensitive feedback, brainstorming, and relationship building are better in real time.",
            "The rule of thumb: use live time for high-emotion or high-ambiguity conversations, and writing for everything else.",
          ],
          list: [
            "Status updates → written",
            "Hard feedback → live",
            "Early brainstorming → live",
            "Decisions of record → written",
          ],
        },
      ],
    ),
  },
  {
    title: "Designing Accessible Color Systems",
    category: "Design",
    cover: cover("1499951360447-b19be8fe80f5"),
    tags: ["design", "accessibility", "color", "systems"],
    status: "published",
    excerpt:
      "Color is one of the easiest things to get wrong and one of the most rewarding to get right. A field guide to building palettes everyone can use.",
    content: buildHtml(
      [
        "Roughly one in twelve men has some form of color vision deficiency. If your interface relies on color alone to convey meaning, you are excluding real users every day.",
        "Accessible color is not a constraint on good design. It is a constraint that produces better design.",
      ],
      [
        {
          h2: "Contrast is non-negotiable",
          body: [
            "Text must meet a minimum contrast ratio against its background - 4.5:1 for body text. This is not a guideline to aspire to; it is the floor.",
            "Build contrast checks into your tooling so violations are caught before they ship, not after a user files a complaint.",
          ],
        },
        {
          h2: "Never rely on color alone",
          body: [
            "A red dot and a green dot are identical to many people. Pair color with shape, text, or iconography so meaning survives without it.",
            "Status badges, charts, and form errors are the usual offenders. Add a label or an icon and the problem disappears.",
          ],
          list: [
            "Error states get an icon and text, not just red",
            "Charts use patterns or direct labels, not color keys alone",
            "Links are distinguishable without relying on hue",
          ],
        },
        {
          h2: "Design tokens keep you honest",
          body: [
            "Encode your palette as semantic tokens - \"foreground\", \"muted\", \"destructive\" - rather than raw hex values sprinkled through the code.",
            "Tokens let you tune the whole system, support dark mode, and guarantee that accessible pairings stay accessible everywhere.",
          ],
        },
      ],
    ),
  },
  {
    title: "Scaling Postgres: Lessons from 200 Tables",
    category: "Engineering",
    cover: cover("1432888622747-4eb9a8efeb07"),
    tags: ["postgres", "database", "scaling", "sql"],
    status: "published",
    excerpt:
      "Postgres will take you remarkably far before you need anything exotic. These are the habits that kept ours fast as the schema grew.",
    content: buildHtml(
      [
        "There is a persistent myth that you need a fashionable new database the moment you hit scale. In practice, a well-tended Postgres instance handles enormous workloads.",
        "As our schema grew past two hundred tables, a few disciplines mattered far more than any clever trick.",
      ],
      [
        {
          h2: "Index for your queries, not in theory",
          body: [
            "The right index turns a sequential scan into an instant lookup. The wrong index just slows down writes for no benefit.",
            "We add indexes by looking at slow query logs, not by guessing. A composite index on the columns a query filters and sorts by is often the single biggest win.",
          ],
          code: "-- Listing query: published posts, newest first\nCREATE INDEX idx_blog_posts_status_published\n  ON blog_posts (status, published_at DESC);",
        },
        {
          h2: "Let the database do the work",
          body: [
            "Joining and aggregating in SQL is almost always faster than pulling rows into application code and looping. The query planner is smarter than hand-rolled loops.",
            "Push filtering, counting, and pagination into the query and return only what the page needs.",
          ],
        },
        {
          h2: "Connections are a finite resource",
          body: [
            "In serverless environments it is easy to exhaust your connection pool. Reuse a single client and size your pool to the runtime you are actually deploying to.",
            "Most \"the database is down\" incidents are really \"the database ran out of connections\" incidents.",
          ],
        },
      ],
    ),
  },
];

export const POSTS: PostSeed[] = [...POSTS_CORE, ...POSTS_EXT];
