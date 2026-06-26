export interface Section {
  h2: string;
  body: string[];
  list?: string[];
  quote?: string;
  code?: string;
}

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

export function buildHtml(intro: string[], sections: Section[]): string {
  const parts: string[] = [];
  for (const p of intro) parts.push(`<p>${p}</p>`);
  for (const s of sections) {
    parts.push(`<h2>${s.h2}</h2>`);
    for (const p of s.body) parts.push(`<p>${p}</p>`);
    if (s.list) parts.push(`<ul>${s.list.map((i) => `<li>${i}</li>`).join("")}</ul>`);
    if (s.quote) parts.push(`<blockquote><p>${s.quote}</p></blockquote>`);
    if (s.code) parts.push(`<pre><code>${s.code}</code></pre>`);
  }
  return parts.join("\n");
}

export const coverUrl = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1200&h=630&fit=crop`;
