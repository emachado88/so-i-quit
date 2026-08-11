import type { CapacitorConfig } from '@capacitor/cli'

const liveUrl = process.env.CAP_LIVE_URL

const config: CapacitorConfig = {
  appId: liveUrl ? 'com.soiquit.dev' : 'com.soiquit.app',
  appName: liveUrl ? 'So I Quit (Dev)' : 'So I Quit',
  webDir: 'dist',
  server: liveUrl
    ? {
        // Dev only (npm run mobile:run:live) — never committed with a URL.
        url: liveUrl,
        cleartext: true,
      }
    : {
        androidScheme: 'https',
      },
  plugins: {
    LocalNotifications: {
      // Status-bar icon for milestone notifications (res/drawable/ic_stat_milestone).
      smallIcon: 'ic_stat_milestone',
      iconColor: '#1A6B5C',
    },
  },
}

export default config
