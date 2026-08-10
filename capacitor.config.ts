import type { CapacitorConfig } from "@capacitor/cli";

const liveUrl = process.env.CAP_LIVE_URL;

const config: CapacitorConfig = {
  appId: liveUrl ? "com.soiquit.dev" : "com.soiquit.app",
  appName: liveUrl ? "So I Quit (Dev)" : "So I Quit",
  webDir: "dist",
  server: liveUrl
    ? {
        // Dev only (npm run mobile:run:live) — never committed with a URL.
        url: liveUrl,
        cleartext: true,
      }
    : {
        androidScheme: "https",
      },
};

export default config;
