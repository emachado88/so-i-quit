# So I Quit

> **Track vices. Celebrate progress.**

<img src="./assets/images/icon.png" width="150" height="150" alt="So I Quit icon" />

---

So I Quit is a React Native (Expo) app that helps you quit habits — alcohol, tobacco, or anything else you set yourself to overcome. Set a quit date, log daily savings, and watch the counters tick. No accounts, no cloud sync, no nonsense.

## Features

- **⏱ Live Counters** — Track years, months, days, hours since quitting each habit
- **💰 Savings Calculator** — Enter how much you spend per day and see total savings grow in real time
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
| Date Handling | dayjs with Portuguese locale                                                             |
| Storage       | AsyncStorage                                                                             |
| Localization  | expo-localization (region, locale, currencyCode detection)                               |
| Animation     | React Native Reanimated 4                                                                |
| Language      | TypeScript 6.0 (strict mode)                                                             |
| Linting       | ESLint 9 with expo config                                                                |

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
  savings-modal.tsx      # Modal for editing per-habit savings
  themed-text.tsx        # Themed text component (title, subtitle, etc.)
constants/
  interfaces.ts          # TypeScript interfaces (Habit, Theme, AppSettings)
  styles.ts              # Global styles (container, shadow, flex1)
  theme.ts               # Light/dark MD3 colour tokens + Inter font config
  currencies.ts          # Currency symbols + region-to-currency maps
contexts/
  settings-context.tsx   # AppSettings context (theme, currency, scheme)
data/
  habits.ts              # AsyncStorage CRUD for habits
  settings.ts            # AsyncStorage persistence for settings + locale detection
hooks/
  use-bump-value.ts      # Scale-bump animation hook (Reanimated)
utils/
  utils.ts               # Date/savings formatting helpers (Intl-based)
assets/
  images/                # App icon, splash, favicon
docs/
  improvements-roadmap.md          # Next-phase roadmap
```

## Roadmap

See [docs/improvements-roadmap.md](./docs/improvements-roadmap.md) for the planned next phases: notifications, accessibility.

## License

MIT — do whatever you want with it.
