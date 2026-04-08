import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://ruyue-kinsenka.github.io",
  base: "/",
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      theme: "github-dark"
    },
    gfm: true,
    breaks: true
  }
});
