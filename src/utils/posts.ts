import { getCollection, type CollectionEntry } from "astro:content";

export type PostEntry = CollectionEntry<"posts">;

export async function getPublishedPosts(): Promise<PostEntry[]> {
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  return posts.sort(
    (a, b) =>
      new Date(b.data.publishedAt).getTime() -
      new Date(a.data.publishedAt).getTime()
  );
}

export function getPostUrl(post: PostEntry): string {
  return `/posts/${post.id}/`;
}

export function summarize(text: string, maxLength = 150): string {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/[#>*_~\-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength)}...`;
}

export function formatDate(date: Date | string): string {
  const target = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(target);
}

export function countWords(content: string): number {
  const pureText = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return pureText ? pureText.length : 0;
}

export function estimateReadMinutes(content: string): number {
  const wordsPerMinute = 400;
  return Math.max(1, Math.round(countWords(content) / wordsPerMinute));
}

export async function getCategorySummary() {
  const posts = await getPublishedPosts();
  const map = new Map<string, number>();

  for (const post of posts) {
    const current = map.get(post.data.category) ?? 0;
    map.set(post.data.category, current + 1);
  }

  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export async function getTagSummary() {
  const posts = await getPublishedPosts();
  const map = new Map<string, number>();

  for (const post of posts) {
    for (const tag of post.data.tags) {
      const current = map.get(tag) ?? 0;
      map.set(tag, current + 1);
    }
  }

  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
