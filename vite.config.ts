import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function normalizeBasePath(input?: string) {
  if (!input) {
    return "./";
  }

  const trimmed = input.trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, "")}/`;
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    plugins: [react(), tailwindcss()],
    base: command === "build" ? normalizeBasePath(env.PINDOU_BASE_PATH) : "/",
  };
});
