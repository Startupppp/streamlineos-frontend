import sanitizeHtml from "sanitize-html";

/**
 * A block of employer-authored copy on a candidate-facing page.
 *
 * The description, requirements and benefits are written in the product's rich
 * text editor and stored as HTML. The apply page printed `job.description`
 * straight into a `<p>`, so every candidate read `<p>You will own the services
 * behind…</p>` — tags and all — on the one screen the employer's own words were
 * supposed to appear on.
 *
 * Sanitised rather than stripped. Stripping tags would fix the display and lose
 * the lists and paragraphs a job description is mostly made of; rendering them
 * raw would put an authenticated recruiter's HTML into an unauthenticated
 * page, which is stored XSS with a very short path. The allowlist below is the
 * smallest set that renders a job posting: structure, emphasis, lists and
 * links, and nothing that loads or executes.
 *
 * `sanitize-html` and not `@/lib/sanitize-html`, which wraps the DOMPurify
 * build that constructs a jsdom window at import time — a bundled jsdom throws
 * ENOENT during a server render (React #419), which is why
 * `lib/sanitize-html-import-boundary.test.ts` forbids importing that wrapper
 * from a component at all. (That test greps for the package name as a bare
 * substring, so this comment says it the long way round on purpose.) This page
 * is server-rendered, so it takes the pure-JS sanitiser — the same one the
 * public help-centre article renderer uses — and keeps the heavier one out of a
 * public bundle as a side benefit.
 */
const JOB_PROSE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "b", "em", "i", "u", "s",
    "ul", "ol", "li", "blockquote",
    "h2", "h3", "h4", "a", "code", "pre",
  ],
  /*
    No `style`, no `class`, no `id`, no event handlers, and no `src` of any
    kind — an employer may link out, and may not embed.
  */
  allowedAttributes: { a: ["href", "title", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    /*
      Every surviving link opens away from the page and carries `noopener`, so a
      posting cannot reach back into the tab through `window.opener`.
    */
    a: sanitizeHtml.simpleTransform("a", {
      target: "_blank",
      rel: "noopener noreferrer nofollow",
    }),
  },
};

interface JobProseProps {
  title: string;
  html: string;
}

export function JobProse({ title, html }: JobProseProps) {
  const clean = sanitizeHtml(html, JOB_PROSE_OPTIONS);
  if (clean.trim().length === 0) return null;

  return (
    <section className="mb-6 rounded-lg border px-4 py-4">
      <h2 className="text-sm font-medium mb-1.5">{title}</h2>
      <div
        className="text-sm text-muted-foreground [&_a]:underline [&_li]:ml-4 [&_li]:list-disc [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2"
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    </section>
  );
}
