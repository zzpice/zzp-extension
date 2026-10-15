import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: {
    dedupe: [
      "react",
      "react-dom",
      "react-router",
      "lucide-react",
      "@radix-ui/react-dialog",
    ],
  },
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environment: "jsdom",
  },
});
