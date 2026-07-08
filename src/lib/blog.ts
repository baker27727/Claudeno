// =========================================================================
// Blog post aggregation — joins the per-locale "blog" collection entries by
// folder slug, same pattern as lib/modules.ts for lessons. Each post lives
// at content/blog/<slug>/{en,no}.md (never a single bilingual file) so a
// reader on /no/blog/<slug>/ only ever sees Norwegian, and vice versa.
// =========================================================================

import { getCollection, type CollectionEntry } from "astro:content";

export interface BlogPostData {
  slug: string; // folder slug, e.g. "2-1-204-whats-new"
  en: CollectionEntry<"blog">;
  no: CollectionEntry<"blog">;
}

function folderOf(entryId: string): string {
  return entryId.replace(/\/[^/]+$/, "");
}

export async function getAllBlogPosts(): Promise<BlogPostData[]> {
  const docs = await getCollection("blog");
  const slugs = [...new Set(docs.map((d) => folderOf(d.id)))];

  const posts = slugs.map((slug): BlogPostData => {
    const en = docs.find((d) => d.id === `${slug}/en`);
    const no = docs.find((d) => d.id === `${slug}/no`);
    if (!en || !no) {
      throw new Error(`Blog post "${slug}" is missing en.md or no.md`);
    }
    return { slug, en, no };
  });

  return posts.sort((a, b) => new Date(b.en.data.pubDate).getTime() - new Date(a.en.data.pubDate).getTime());
}

export function postForLocale(post: BlogPostData, lang: "en" | "no"): CollectionEntry<"blog"> {
  return lang === "no" ? post.no : post.en;
}
