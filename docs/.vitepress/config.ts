import { defineConfig } from "vitepress";

export default defineConfig({
  title: "JavaScript Browser Utilities",
  description: "JavaScript Browser Utilities documentation",
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "API", link: "/api/" },
      { text: "Demo", link: "/demo/" },
    ],
  },
});
