# So I Quit

> **Track vices. Celebrate progress.**

<img src="./assets/images/icon.png" width="150" height="150" alt="So I Quit icon" />

---

So I Quit is a React Native (Expo) app that helps you quit habits — alcohol, tobacco, or anything else you set yourself to overcome. Set a quit date, log daily savings, and watch the counters tick. No accounts, no cloud sync, no nonsense.

## Features

- **⏱ Live Counters** — Track years, months, days, hours since quitting each habit
- **💰 Savings Calculator** — Enter how much you spend per day and see total savings grow in real time
- **🎉 Milestone Rings** — Daily/weekly/monthly/yearly celebration rings with opt-in local notifications
- **🎨 Theme Override** — Choose System, Light, or Dark mode (persisted)
- **💱 Currency Picker** — Searchable currency selector with locale-based auto-detection on first run
- **🌍 Locale-aware** — Dayjs locale matches device region; currency formatting uses Intl.NumberFormat
- **📱 Cross-platform** — Android + iOS (tested on Android only)
- **💾 Local Only** — All data stays on-device via AsyncStorage (no account needed)
- **🎯 Multiple Habits** — Track alcohol, tobacco, custom habits simultaneously

## Tech Stack

| Layer         | Technology                                                                               |
| ------------- | ---------------------------------------------------------------------------------------- |
| Framework     | [Expo](https://expo.dev) SDK 57 + [React Native](https://reactnative.dev) 0.86           |
| Navigation    | [Expo Router](https://docs.expo.dev/router/introduction/) v57 (file-based routing)       |
| UI            | [React Native Paper](https://reactnativepaper.com) with custom MD3 theme tokens          |
| Date Handling | dayjs (locale synced with app language)                                                  |
| Storage       | AsyncStorage                                                                             |
| Localization  | expo-localization (region, locale, currencyCode detection)                               |
| Animation     | React Native Reanimated 4                                                                |
| Notifications | expo-notifications (local milestone celebrations)                                        |
| Language      | TypeScript 6.0 (strict mode)                                                             |
| Linting       | ESLint 9 with expo config                                                                |
| Testing       | Vitest (milestone logic unit tests)                                                      |
| Monitoring    | [Sentry](https://sentry.io) (`@sentry/react-native`)                                    |

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server
npm start
```

Scan the QR code with Expo Go, or press `a` for Android / `i` for iOS simulator.

### Scripts

| Command           | Description                 |
| ----------------- | --------------------------- |
| `npm start`       | Start Expo dev server       |
| `npm run android` | Start with Android emulator |
| `npm run ios`     | Start with iOS simulator    |
| `npm run web`     | Start with web browser      |
| `npm run lint`    | Run ESLint                  |
| `npm test`        | Run Vitest unit tests       |

### Build

```bash
# Android APK/AAB
npx eas build --platform android

# iOS IPA
npx eas build --platform ios
```

## Project Structure

```
app/                     # Expo Router pages
  (tabs)/                # Tab navigator screens
    _layout.tsx          # Tab bar (3 tabs: Progress, Habits, Settings)
    index.tsx            # Progress — live counters, savings summary
    habits.tsx           # Habits — CRUD, date/time pickers, savings input
    settings.tsx         # Settings — app config (theme, language, currency)
  _layout.tsx            # Root layout — theme provider, locale, fonts, context
components/
  animated-counters.tsx  # Animated TimeValue + MoneyValue counters (Reanimated spring)
  haptic-tab.tsx         # Haptic feedback tab button
  milestone-ring.tsx     # Circular milestone progress ring (Reanimated + SVG)
  milestone-opt-in-dialog.tsx  # Opt-in prompt for milestone notifications
  savings-modal.tsx      # Modal for editing per-habit savings
  themed-text.tsx        # Themed text component (title, subtitle, etc.)
lib/
  sentry.ts              # Sentry initialisation + error boundary
  milestones.ts          # Milestone calendar + formatting logic
  milestone-notifications.ts  # Local milestone notifications (Expo Go–safe)
constants/
  types.ts               # TypeScript types (Habit, Milestone, Theme, AppSettings)
  styles.ts              # Global styles (container, shadow, flex1)
  theme.ts               # Light/dark MD3 colour tokens + Inter font config
  currencies.ts          # Currency symbols + region-to-currency maps
contexts/
  settings-context.tsx   # AppSettings context (theme, currency, scheme)
data/
  habits.ts              # AsyncStorage CRUD for habits
  milestones.ts          # AsyncStorage persistence for milestones
  settings.ts            # AsyncStorage persistence for settings + locale detection
hooks/
  use-bump-value.ts      # Scale-bump animation hook (Reanimated)
utils/
  utils.ts               # Date/savings formatting helpers (Intl-based)
assets/
  images/                # App icon, splash, favicon
```

## Roadmap

Milestones + local notifications are shipped. Next planned phase: react-native-paper phase-out (custom components).

## License

MIT — do whatever you want with it.
