# So I Quit

> **Track your vices. Celebrate your progress. Save your money.**

<img src="./assets/images/icon.png" width="150" height="150" alt="So I Quit icon">

---

So I Quit is a React Native (Expo) app that helps you quit habits — alcohol, tobacco, or anything else you choose. Set a quit date, log your daily savings, and watch the counters tick. No accounts, no cloud sync, no nonsense.

## Features

- **⏱ Live Counters** — Track years, months, days, and hours since you quit each habit
- **💰 Savings Calculator** — Enter how much you spend per day and see your total savings grow in real time
- **📱 Cross-platform** — iOS, Android, and Web from a single codebase
- **🌙 Dark Mode** — Follows your system theme automatically
- **💾 Local Only** — All data stays on-device via AsyncStorage (no account needed)
- **🎯 Multiple Habits** — Track alcohol, tobacco, and custom habits simultaneously

## Tech Stack

| Layer         | Technology                                                                        |
| ------------- | --------------------------------------------------------------------------------- |
| Framework     | [Expo](https://expo.dev) SDK 54 + [React Native](https://reactnative.dev) 0.81    |
| Navigation    | [Expo Router](https://docs.expo.dev/router/introduction/) v6 (file-based routing) |
| UI | [React Native Paper](https://reactnativepaper.com) with custom MD3 theme tokens |
| Date Handling | dayjs with Portuguese locale                                                      |
| Storage       | AsyncStorage                                                                      |
| Animation     | React Native Reanimated 4                                                         |
| Language      | TypeScript 5.9 (strict mode)                                                      |
| Linting       | ESLint 9 + expo config                                                            |

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
    _layout.tsx          # Tab bar configuration
    index.tsx            # Home screen — counters + savings
    settings.tsx         # Habit management — dates, savings, CRUD
  _layout.tsx            # Root layout — theme provider
components/
  ui/                   # Reusable UI components
  haptic-tab.tsx        # Haptic feedback tab button
  themed-text.tsx       # Themed text component (title, subtitle, etc.)
constants/
  interfaces.ts         # TypeScript interfaces (Habit, etc.)
  styles.ts             # Global styles (container, shadow, flex1)
  theme.ts              # Light/dark colour tokens
hooks/
  use-color-scheme.ts   # SSR-safe color scheme hook
  use-theme-color.ts    # Theme-aware colour lookup
utils/
  habits.ts             # AsyncStorage CRUD for habits
  format.ts             # Date/savings formatting helpers
assets/
  images/               # App icon, splash, favicon
docs/
  improvements-roadmap.md          # Next-phase roadmap
```

## Conventions

- **Arrow functions** for components and hooks (`const fn = () => {}`)
- **StyleSheet.create** for static styles, inline for dynamic theme colours
- **Named exports** for utility functions, default exports for screens
- **Path aliases** `@/` maps to project root
- **Strict TypeScript** enabled — fix errors at compile time, not runtime

## Roadmap

See [docs/improvements-roadmap.md](./docs/improvements-roadmap.md) for the planned next phase: UI overhaul (dropping react-native-paper), tab reorganisation, notifications, analytics, and accessibility.

## License

MIT — do whatever you want with it.
