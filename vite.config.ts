import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

// Load all env vars (including non-VITE_ server secrets like
// SUPABASE_SERVICE_ROLE_KEY) into process.env for server routes only.
// These are NOT added to the client bundle.
Object.assign(
  process.env,
  loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), ""),
);

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
});
