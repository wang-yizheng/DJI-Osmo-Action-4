import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// 从 GITHUB_REPOSITORY 环境变量中提取仓库名
// 格式: owner/repo-name
const getBasePath = () => {
  if (process.env.GITHUB_REPOSITORY) {
    const repoName = process.env.GITHUB_REPOSITORY.split('/')[1];
    return `/${repoName}/`;
  }
  return '/';
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: getBasePath(),
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
  },
});
