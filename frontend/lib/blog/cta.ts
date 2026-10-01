/**
 * Product calls to action an editor can attach to an article (the admin stores only the key).
 * Every destination is an existing StreamlineOS page. Placement is recorded in a data attribute for
 * analytics; the link itself carries no tracking parameters, so canonical URLs stay clean.
 */
export const BLOG_CTAS = {
  pricing: { href: "/pricing", label: "See plans and pricing", blurb: "One platform for people, projects and customers. Compare plans." },
  contact: { href: "/contact", label: "Talk to the StreamlineOS team", blurb: "Tell us how your team works today and we will show you where StreamlineOS fits." },
  about: { href: "/about", label: "How StreamlineOS works", blurb: "HR, projects, CRM, chat and analytics on one shared foundation." },
} as const;

export type BlogCtaKey = keyof typeof BLOG_CTAS;

function isCtaKey(key: string): key is BlogCtaKey {
  return Object.hasOwn(BLOG_CTAS, key);
}

export function blogCta(key: string | null | undefined) {
  return key && isCtaKey(key) ? BLOG_CTAS[key] : BLOG_CTAS.about;
}
