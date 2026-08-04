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
- **🗣 Multi-language** — Zero-dependency i18n: EN, PT, FR, ES, IT, ZH (Simplified), DE, NL
- **📱 Cross-platform** — Android + iOS (tested on Android only)
- **💾 Local Only** — All data stays on-device via AsyncStorage (no account needed)
- **🎯 Multiple Habits** — Track alcohol, tobacco, custom habits simultaneously

## Tech Stack

| Layer         | Technology                                                                               |
| ------------- | ---------------------------------------------------------------------------------------- |
| Framework     | [Expo](https://expo.dev) SDK 57 + [React Native](https://reactnative.dev) 0.86           |
| Navigation    | [Expo Router](https://docs.expo.dev/router/introduction/) v57 (file-based routing)       |
| UI            | [React Native Paper](https://reactnativepaper.com) with custom MD3 theme tokens (being phased out) |
| Date Handling | dayjs (locale synced with app language)                                                  |
| Storage       | AsyncStorage                                                                             |
| Localization  | expo-localization + zero-dependency i18n layer (`i18n/`)                                 |
| Animation     | React Native Reanimated 4                                                                |
| Notifications | expo-notifications (local milestone celebrations, Expo Go–safe lazy load)                |
| Language      | TypeScript 6.0 (strict mode)                                                             |
| Linting       | ESLint 9 with expo config                                                                |
| Testing       | jest-expo + @testing-library/react-native v14 (80% coverage gate)                        |
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

| Command                 | Description                                 |
| ----------------------- | ------------------------------------------- |
| `npm start`             | Start Expo dev server                       |
| `npm run android`       | Start with Android emulator                 |
| `npm run ios`           | Start with iOS simulator                    |
| `npm run web`           | Start with web browser                      |
| `npm run lint`          | Run ESLint (expo config)                    |
| `npx tsc --noEmit`      | TypeScript type check (strict mode)         |
| `npm test`              | Run Jest unit + component tests             |
| `npm run test:coverage` | Run Jest with coverage (80% thresholds)     |

### Build

```bash
# Android APK/AAB
npx eas build --platform android

# iOS IPA
npx eas build --platform ios
```

## Testing

- **Stack:** jest-expo (SDK 57 preset) + **@testing-library/react-native v14** (universal `test-renderer`). Logic layers (`utils`, `data`, `i18n`, `lib`) run in node; components/screens use RTL.
- **RTL v14 API is fully async** — `await render(...)`, `await fireEvent.press(...)`, `await renderHook(...)` — with semantic queries (`getByRole`, `getByText`, `getByTestId`, `getByPlaceholderText`) and `toHaveProp`/`toHaveStyle` matchers.
- **Coverage:** ≥80% on lines/functions/branches/statements, enforced by `coverageThreshold` in `jest.config.js` via `npm run test:coverage` (currently ~93/86/86/94 — green).
- **Layout:** colocated `__tests__/` dirs (`components/__tests__/`, `app/(tabs)/__tests__/`, …); `collectCoverageFrom` excludes tests.
- **Global mocks (`test/setup-jest.ts`):** in-memory AsyncStorage, expo-localization/constants fixtures, expo-router stubs, reanimated/svg/safe-area-context stubs, haptics/fonts/sentry/datetimepicker mocks. `expo-notifications` is deliberately unmocked — the app's Expo Go guard keeps it inert.
- **`test/utils.tsx`:** `renderWithProviders` (AppSettingsContext + PaperProvider with the active scheme) + `makeHabit`/`makeMilestone`/`makeSettingsValue` fixtures.

## Project Structure

```
app/                     # Expo Router pages (file-based)
  (tabs)/
    _layout.tsx          # Tab bar (3 tabs: Progress, Habits, Settings)
    index.tsx            # Progress — live counters, savings summary, sorted oldest-first
    habits.tsx           # Habits — CRUD, date/time pickers, savings input (max 50%)
    settings.tsx         # Settings — app config (theme, language, currency)
  _layout.tsx            # Root — PaperProvider, StatusBar, dayjs locale, Inter fonts, settings context
components/
  animated-counters.tsx  # Animated TimeValue + MoneyValue counters (Reanimated spring bump)
  haptic-tab.tsx         # Tab button with haptic feedback
  milestone-ring.tsx     # Circular milestone progress ring (Reanimated + react-native-svg)
  milestone-opt-in-dialog.tsx  # Post-wizard opt-in prompt for milestone notifications
  savings-modal.tsx      # Modal for editing per-habit savings amount
  themed-text.tsx        # Themed text component (title, subtitle, default, link)
lib/
  sentry.ts              # Sentry init + error boundary wrapper
  milestones.ts          # Milestone calendar: generateMilestones, isMilestoneReached, formatting
  milestone-notifications.ts  # Local milestone notifications (Expo Go–safe lazy import)
constants/
  types.ts               # Habit, Milestone, Theme, AppSettings types
  styles.ts              # globalStyles: container, shadow, flex1, flexRow, flexWrap, spacedUppercase
  theme.ts               # Light/dark MD3 colour tokens + Inter font config
  currencies.ts          # Currency symbols + region-to-currency maps
contexts/
  settings-context.tsx   # AppSettings context (theme, currency, language, scheme, t())
i18n/
  en.ts                  # English (base — defines shape for all languages)
  pt.ts, fr.ts, es.ts,   # Portuguese, French, Spanish, Italian,
  it.ts, zh.ts, de.ts,   #   Chinese (Simplified), German, Dutch
  nl.ts
  index.ts               # useTranslation hook, detectLanguage(), SUPPORTED_LANGUAGES
data/
  habits.ts              # AsyncStorage CRUD for habits
  milestones.ts          # AsyncStorage persistence for milestones ("milestones-v1")
  settings.ts            # AsyncStorage persistence for settings + locale detection
hooks/
  use-bump-value.ts      # Scale-bump animation hook (Reanimated)
utils/
  utils.ts               # daysSince, breakdown, parseSavings, formatAmount (Intl-based)
test/
  setup-jest.ts          # Global mocks (AsyncStorage, expo, router, reanimated, …)
  utils.tsx              # renderWithProviders + test fixtures
assets/
  images/                # App icon, splash, favicon
```

## Roadmap

1. ~~Custom MD3 colour palette (light + dark)~~ ✅ Done
2. ~~Tab reorganisation (Progress / Habits / Settings), theme/language/currency~~ ✅ Done
3. ~~Milestone tracking + local notifications (animated counters, milestone rings)~~ ✅ Done
4. ~~App hardening (TS strictness, Sentry, accessibility, test suite)~~ ✅ Done — jest-expo + RTL-RN v14, 80% coverage gate via `npm run test:coverage`
5. Next: react-native-paper phase-out (custom components)

## License

MIT — do whatever you want with it.
