import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const posts = defineCollection({
  loader: glob({
    base: "./src/content/posts",
    pattern: "**/*.md"
  }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().max(220).nullable().default(""),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    category: z.string().min(1),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    cover: z.string().default("/images/cover.jpg"),
    coverAlt: z.string().optional()
  })
});

export const collections = { posts };
