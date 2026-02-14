import { getPublishedPosts, getPostUrl, summarize } from "@/utils/posts";

export async function GET() {
  const posts = await getPublishedPosts();

  const payload = posts.map((post) => ({
    id: post.id,
    title: post.data.title,
    description: post.data.description,
    category: post.data.category,
    tags: post.data.tags,
    url: getPostUrl(post),
    content: summarize(post.body ?? "", 400)
  }));

  return new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
