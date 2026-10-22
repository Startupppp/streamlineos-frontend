import sanitizeHtml from "sanitize-html";

const JOB_PROSE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "b", "em", "i", "u", "s",
    "ul", "ol", "li", "blockquote",
    "h2", "h3", "h4", "a", "code", "pre",
  ],
  allowedAttributes: { a: ["href", "title", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
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
