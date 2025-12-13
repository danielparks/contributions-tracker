import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// https://vite.dev/config/
export default defineConfig({
  base: "",
  plugins: [
    checker({
      typescript: {
        buildMode: true,
      },
      eslint: {
        useFlatConfig: true,
        lintCommand: 'eslint "src/**/*.{ts,tsx}"',
      },
    }),
    react(),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        static: resolve(__dirname, "static.html"),
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
});
