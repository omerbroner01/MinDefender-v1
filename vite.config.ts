import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Enable HTTPS in development for mobile camera access
// basic-ssl plugin is optional; we'll require it dynamically in dev to avoid type errors if not installed
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(async () => {
  const isProd = process.env.NODE_ENV === "production";

  // Attempt to load optional Replit plugins synchronously. They are optional and
  // may not be installed in all environments. Use try/catch to avoid hard failure.
  const replitPlugins: any[] = [];
  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const carto = require('@replit/vite-plugin-cartographer');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const devBanner = require('@replit/vite-plugin-dev-banner');
      if (carto && typeof carto.cartographer === 'function') replitPlugins.push(carto.cartographer());
      if (devBanner && typeof devBanner.devBanner === 'function') replitPlugins.push(devBanner.devBanner());
    } catch (e) {
      // optional plugins not available — ignore
      // eslint-disable-next-line no-console
      console.warn('Optional replit plugins not loaded:', e && (e as any).message);
    }
  }

  const effectiveLogLevel: any = isProd ? 'error' : 'info';

  // Try to load HTTPS plugin conditionally
  let httpsPlugins: any[] = [];
  if (!isProd) {
    try {
      // Use ESM-friendly dynamic import to load the optional plugin
      const basicSslMod: any = await import('@vitejs/plugin-basic-ssl');
      const basicSsl = basicSslMod?.default ?? basicSslMod;
      if (typeof basicSsl === 'function') {
        httpsPlugins.push(basicSsl());
      }
    } catch (e) {
      console.warn('HTTPS dev plugin not installed. Mobile camera will require HTTPS. Install @vitejs/plugin-basic-ssl to enable HTTPS in dev.');
    }
  }

  return {
    // Only enable runtime error overlay in development to avoid noisy logs
  plugins: isProd ? [react(), ...replitPlugins] : [react(), runtimeErrorOverlay(), ...httpsPlugins, ...replitPlugins],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": path.resolve(__dirname, "shared"),
        "@assets": path.resolve(__dirname, "attached_assets"),
      },
    },
    root: path.resolve(__dirname, "client"),
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,
    },
  // Keep server logs minimal; developers can increase verbosity locally with VITE_DEBUG
  logLevel: effectiveLogLevel,
    server: {
      // If https plugin is present, Vite will enable HTTPS automatically with a self-signed cert
      // Some Vite versions type this as ServerOptions only; cast to any to keep TS happy across versions
      https: (httpsPlugins.length > 0 ? (true as any) : undefined) as any,
      host: true,  // allow LAN access for mobile devices
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
