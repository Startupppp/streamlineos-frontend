import { buildHtml, coverUrl, PostSeed } from "./seed-blog-utils";

const cover = coverUrl;

export const POSTS_EXT: PostSeed[] = [
  {
    title: "Content Marketing That Actually Converts",
    category: "Marketing",
    cover: cover("1460925895917-afdab827c52f"),
    tags: ["marketing", "content", "growth", "seo"],
    status: "published",
    excerpt:
      "Publishing more is not a strategy. Here is how to write content that earns trust and turns readers into customers.",
    content: buildHtml(
      [
        "Most content marketing fails not because the writing is bad, but because it is written for search engines instead of people. The result is a graveyard of posts that rank for nothing and persuade no one.",
        "Content that converts starts from a different question: what does our reader genuinely need to know to make a confident decision?",
      ],
      [
        {
          h2: "Write for one person",
          body: [
            "Generic advice helps no one. The more specifically you write for a single reader with a single problem, the more universally useful the piece becomes.",
            "Name the reader, name their problem, and solve it completely before you ask for anything in return.",
          ],
          quote: "Give away your best ideas. The fear that you will run out is unfounded; generosity is the strategy.",
        },
        {
          h2: "Earn the next click",
          body: [
            "Every piece of content has one job: to be so useful that the reader trusts you with the next step. That step might be another article, a demo, or a signup.",
            "Trust compounds. A reader who learned something real from you arrives at your product already believing you know what you are doing.",
          ],
        },
        {
          h2: "Measure the right thing",
          body: [
            "Pageviews are vanity. The metric that matters is whether readers take a meaningful next action and, eventually, become customers.",
            "Track the full path from first read to conversion, and invest in the topics that actually move it.",
          ],
          list: [
            "Time on page and scroll depth signal genuine engagement",
            "Returning readers signal trust",
            "Assisted conversions reveal which topics pull their weight",
          ],
        },
      ],
    ),
  },
  {
    title: "Shipping Faster with Feature Flags",
    category: "Engineering",
    cover: cover("1488590528505-98d2b5aba04b"),
    tags: ["engineering", "deployment", "feature-flags", "ci-cd"],
    status: "published",
    excerpt:
      "Feature flags decouple deploy from release. That one change transforms how confidently a team can ship.",
    content: buildHtml(
      [
        "The scariest part of shipping is not writing the code - it is the moment it reaches everyone at once. Feature flags remove that fear by separating two things we usually conflate: deploying code and releasing a feature.",
        "With flags, code can live in production long before it is switched on, and it can be switched off in seconds if something goes wrong.",
      ],
      [
        {
          h2: "Deploy continuously, release deliberately",
          body: [
            "Merging small changes often is safer than merging large changes rarely. Flags let you merge incomplete work behind a switch, keeping branches short and conflicts rare.",
            "Releasing then becomes a business decision, made by flipping a flag, rather than an engineering event tied to a deploy.",
          ],
        },
        {
          h2: "Roll out gradually",
          body: [
            "Turn a feature on for your own team first, then a small percentage of users, then everyone. Each step is a chance to catch problems while the blast radius is small.",
            "If metrics dip, you roll back instantly - no hotfix, no redeploy.",
          ],
          code: "if (flags.isEnabled('new-editor', user)) {\n  return <NewEditor />;\n}\nreturn <LegacyEditor />;",
        },
        {
          h2: "Clean up after yourself",
          body: [
            "Flags are debt. A flag that has been fully rolled out for months is just dead branches waiting to confuse someone.",
            "Treat flag removal as part of finishing a feature, not an optional chore.",
          ],
        },
      ],
    ),
  },
  {
    title: "The Founder's Guide to Early Hiring",
    category: "Business",
    cover: cover("1454165804606-c3d57bc86b40"),
    tags: ["hiring", "startups", "team", "leadership"],
    status: "published",
    excerpt:
      "Your first ten hires set the ceiling for everything that follows. A few hard-won lessons on getting them right.",
    content: buildHtml(
      [
        "Early hires are not just employees; they are co-authors of your culture. The habits and standards of your first ten people become the defaults the next hundred inherit.",
        "That makes early hiring the highest-leverage thing a founder does - and the easiest to rush under pressure.",
      ],
      [
        {
          h2: "Hire for slope, not intercept",
          body: [
            "In a fast-moving company, how quickly someone learns matters more than what they already know. The role you hire for today will be different in six months.",
            "Look for evidence of rapid growth and genuine curiosity over a polished but static résumé.",
          ],
          quote: "Hire people who are better than you at something that matters, then get out of their way.",
        },
        {
          h2: "Protect the bar",
          body: [
            "It is tempting to lower standards when you are desperate for hands. It is also how teams quietly fall apart. A bad hire is far more expensive than an empty seat.",
            "Saying no to a maybe is one of the most valuable disciplines a founder can build.",
          ],
        },
        {
          h2: "Sell the mission, honestly",
          body: [
            "The best people have options. They join because they believe in what you are building and trust the people they will build it with.",
            "Be candid about the hard parts. People who join with clear eyes stay through the hard parts.",
          ],
        },
      ],
    ),
  },
  {
    title: "SEO Fundamentals for SaaS in 2026",
    category: "Marketing",
    cover: cover("1553877522-43269d4ea984"),
    tags: ["seo", "marketing", "saas", "growth"],
    status: "published",
    excerpt:
      "Search has changed, but the fundamentals have not. What actually moves the needle for SaaS discoverability today.",
    content: buildHtml(
      [
        "Every year someone declares SEO dead, and every year it quietly remains one of the highest-return channels for SaaS. What has changed is that shortcuts no longer work.",
        "The winning strategy in 2026 is unglamorous: be genuinely the best answer to the questions your customers are asking.",
      ],
      [
        {
          h2: "Structure for both readers and machines",
          body: [
            "Clean semantic markup, descriptive titles, and structured data help search engines understand your pages - and the same structure helps humans scan them.",
            "Good information architecture is good SEO. They are not in tension.",
          ],
          list: [
            "One clear topic per page",
            "Descriptive, unique titles and meta descriptions",
            "Structured data for articles and products",
          ],
        },
        {
          h2: "Earn authority slowly",
          body: [
            "Authority comes from other people referencing you because you said something worth referencing. There is no durable shortcut.",
            "Invest in a few genuinely excellent pages rather than hundreds of thin ones. Depth ranks; padding does not.",
          ],
        },
        {
          h2: "Speed and experience are ranking signals",
          body: [
            "A fast, stable, mobile-friendly page ranks better and converts better. Performance work pays off twice.",
            "Core web vitals are not a checkbox; they are a proxy for whether your site respects the reader's time.",
          ],
        },
      ],
    ),
  },
  {
    title: "Our Move to Server Components",
    category: "Technology",
    cover: cover("1467232004584-a241de8bcf5d"),
    tags: ["react", "nextjs", "architecture", "frontend"],
    status: "draft",
    excerpt:
      "A behind-the-scenes look at migrating to React Server Components - the wins, the gotchas, and what we would do differently.",
    content: buildHtml(
      [
        "Server components promised less client JavaScript and simpler data fetching. After migrating a large surface of the app, we can report that the promise is real - with caveats.",
        "This is an honest account of what went well and what tripped us up, written while the migration is still fresh.",
      ],
      [
        {
          h2: "The wins were immediate",
          body: [
            "Moving data fetching to the server deleted entire categories of client-side loading state and race conditions. Pages arrived with data already in place.",
            "Bundle sizes dropped because logic that used to ship to the browser now ran on the server and never left it.",
          ],
        },
        {
          h2: "The mental model takes adjustment",
          body: [
            "The hardest part was internalizing the boundary between server and client components. Reaching for a hook in the wrong place produces confusing errors until the model clicks.",
            "Once it clicks, the rule is simple: server by default, client only where you need interactivity.",
          ],
        },
        {
          h2: "What we would do differently",
          body: [
            "We would migrate leaf components first and work upward, rather than starting with shared layouts. Bottom-up kept each change small and reversible.",
            "We would also invest earlier in clear conventions for where the client boundary lives, to spare the team a lot of trial and error.",
          ],
        },
      ],
    ),
  },
];
