export const SITE = {
  title: "Ruyue",
  description: "MY BLOG",
  author: "Ruyue",
  url: "https://ruyue-kinsenka.github.io"
};

export const NAV_ITEMS = [
  { label: "首页", href: "/" },
  { label: "分类", href: "/categories/" },
  { label: "标签", href: "/tags/" },
  { label: "搜索", href: "/search/" },
  { label: "管理", href: "/admin/" }
];

export const WALINE = {
  serverURL: import.meta.env.PUBLIC_WALINE_SERVER_URL ?? ""
};
