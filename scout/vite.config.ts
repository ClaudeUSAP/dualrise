import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// `vite build` writes dist/ successfully but the Node process never exits
// (a native dependency keeps the event loop alive). This hangs CI and local
// builds. Force a clean exit once the bundle is fully written — build only,
// so `vite dev` is unaffected.
const forceExitAfterBuild = () => ({
  name: "force-exit-after-build",
  apply: "build" as const,
  closeBundle() {
    setTimeout(() => process.exit(0), 0);
  },
});

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    forceExitAfterBuild(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
