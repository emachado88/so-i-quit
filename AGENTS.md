# AGENTS.md

## Project Overview

A React Native (Expo) habit tracker that counts time since quitting and calculates accumulated savings. Local-only, no backend. The UI uses React Native Paper components driven by custom MD3 theme tokens (light + dark).

## Tech Stack

- **Expo SDK 57** + **React Native 0.86** (new architecture enabled)
- **Expo Router v57** — file-based routing under `app/`
- **TypeScript 6.0** — strict mode
- **react-native-paper** (being phased out) — Card, Button, TextInput, Snackbar, Divider
- **dayjs** — date manipulation (locale: pt)
- **@react-native-async-storage/async-storage** — persistence
- **react-native-reanimated v4** — animations
- **@react-native-community/datetimepicker** — native date/time pickers
- **expo-font** + **@expo-google-fonts/inter** — Inter font family (Black, Bold, SemiBold, Medium, Regular)
- **expo-localization** — locale/region detection (device timezone, currency, language)
- **expo-build-properties** — native build configuration

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
  savings-modal.tsx      # Modal for editing per-habit savings amount
  themed-text.tsx        # ThemedText component (title/subtitle/default/link)
  external-link.tsx      # External link helper
constants/
  interfaces.ts          # Habit { id, key?, name, date, savings }, Theme, AppSettings types
  styles.ts              # globalStyles: container, shadow, flex1, flexWrap, flexRow, spacedUppercase
  theme.ts               # Colors (standard/light/dark), themes (MD3LightTheme/MD3DarkTheme), fontFamilyConfig
  currencies.ts          # CURRENCY_SYMBOLS + REGION_TO_CURRENCY maps
contexts/
  settings-context.tsx   # AppSettingsContext: theme, currency, language, scheme, t() function
i18n/
  en.ts                  # English translations (base — defines shape for all languages)
  pt.ts, fr.ts, es.ts,   # Translations: Portuguese, French, Spanish, Italian
  it.ts, zh.ts, de.ts,   #   Chinese (Simplified), German, Dutch
  nl.ts
  index.ts               # useTranslation hook, detectLanguage(), SUPPORTED_LANGUAGES, interpolation
data/
  habits.ts              # AsyncStorage CRUD (getHabits, addHabit, updateHabit, deleteHabit, saveHabits)
  settings.ts            # AsyncStorage persistence for theme, language, currency + locale-based detection
hooks/
  use-bump-value.ts      # useBumpValue hook — scale-bump animation on value change (Reanimated)
utils/
  utils.ts               # daysSince, breakdown, parseSavings, formatAmount (Intl-based)
assets/
  images/                # icon.png, splash-icon.png, favicon.png, etc.
```

## Coding Conventions

### Imports
- `@/` path alias maps to project root
- React Native Paper components: prefer `import { X } from "react-native-paper"` (public barrel)
- Group: React → RN → Expo → Paper → project modules → local

### Components
- Arrow functions (`const Comp = () => {}`), default exports for screens
- Props typed inline or via exported interface
- Presentational components in `components/`, screens in `app/`

### Styles
- `StyleSheet.create({...})` for static styles at module bottom
- Inline styles `style={{ color: themes[colorScheme].colors.X }}` only for **dynamic theme colours**
- Shared styles in `constants/styles.ts` (`globalStyles.container`, `globalStyles.flex1`, `globalStyles.flexRow`, `globalStyles.flexWrap`, `globalStyles.spacedUppercase`)
- No `StyleSheet.flatten` — use array syntax: `style={[base, custom]}`

### State & Effects
- `useFocusEffect` from expo-router for data loading on focus (not `useEffect`)
- No polling — tick intervals inside `useFocusEffect` for live counters, cleanup handled automatically
- `const [, setTick] = useState(0)` for re-render triggers (no storage reads on tick)

### Data Layer
- Errors propagate from `data/habits.ts` — screens catch and show Snackbar
- IDs: timestamp + random suffix: `` `${Date.now()}-${Math.random().toString(36).substring(2, 11)}` ``
- AsyncStorage key: `"habits"` (JSON array of Habit objects)
- Habit interface includes optional `key` field for i18n standard habit names (e.g. `"habits.alcohol"`); custom habits use `name` directly

### i18n (Internationalization)
- **Zero-dependency** custom solution using `expo-localization` (already installed)
- Translation files in `i18n/{lang}.ts` — English (`en.ts`) is the base and defines the type shape
- All other languages satisfy `Record<TranslationKey, string>` (enforced by TypeScript)
- Access translations via `const { t } = useAppSettings()` — never import translation files directly
- Interpolation: `t("progress.freeFor", { name: habit.name })` → replaces `{{name}}` placeholders
- Flat dot-separated keys: `t("habits.failedToDelete")`, not nested objects
- Auto-detect on first run: `detectLanguage()` reads `getLocales()[0]`, maps to supported code, persists to AsyncStorage
- Fallback chain: requested language → English → raw key
- Language picker in settings screen uses `SUPPORTED_LANGUAGES` from `i18n/index.ts`
- Adding a new language: create `i18n/{code}.ts`, add to `translations` map in `i18n/index.ts`, add to `SUPPORTED_LANGUAGES`
- dayjs locale imports are in `app/_layout.tsx` — add new locale import there when adding languages

## Theme & Fonts

### Colour Tokens
`Colors` in `constants/theme.ts` has three tiers:
- **`Colors.standard`** — shared accent colours (primary, hover, depth, accent, subtleFill, vitality, success, danger)
- **`Colors.light`** / **`Colors.dark`** — surface/background tones (background, surface, card, border, muted, foreground, text)

### MD3 Theme Mapping
`themes.light` / `themes.dark` spread `MD3LightTheme`/`MD3DarkTheme` and override `colors` with the custom tokens plus `configureFonts` for the Inter family. Access via `themes[colorScheme].colors.X`.

### Inter Font Family
Loaded in `app/_layout.tsx` via `useFonts` from `expo-font` with PostScript names:
- `Inter-Black` (900), `Inter-Bold` (700), `Inter-SemiBold` (600), `Inter-Medium` (500), `Inter-Regular` (400)
- Headings use Black/Bold, body uses Regular/Medium/SemiBold
- Configured via `fontFamilyConfig` + `configureFonts` in `constants/theme.ts`

## Linting & Type Checking

```bash
npm run lint                    # ESLint (expo config)
npx tsc --noEmit               # TypeScript check (strict mode)
```

## Key Decisions & Pitfalls

### iOS Date/Time Picker
- `DateTimePickerAndroid.open()` is Android-only and **crashes on iOS**
- Fix: `handleOpenPicker()` dispatches on `Platform.OS === "android"` → `DateTimePickerAndroid.open()`, iOS → conditionally renders `<DateTimePicker>` component
- State: `pickerOpen: { habitId, mode } | null` controls iOS visibility

### React Native Paper Deep Imports
- Older code imported from `react-native-paper/src/...` — **do not follow this pattern**
- Use barrel imports: `import { Card, Button } from "react-native-paper"`
- Already fixed across the codebase (ticket 2.1)

### AsyncStorage Error Handling
- `utils/habits.ts` functions do NOT catch internally — errors propagate to callers
- Screens wrap calls in try/catch and show errors via Snackbar
- This was intentional (fixes silent data loss from 1.4)

### Live Counter Ticks
- The breakdown display must update in real time (years/months/days/hours since quit)
- Solution: lightweight `setInterval(() => setTick(t => t + 1), 1000)` inside `useFocusEffect`
- Re-render only — no storage I/O on ticks (the quit date is cached in state)

### Inter Font Loading
- Use PostScript names as `useFonts` keys (e.g. `Inter_400Regular` → `"Inter-Regular"`)
- Underscore names (`Inter_400Regular`) don't resolve on iOS — always map to PostScript form
- Fonts load synchronously; `app/_layout.tsx` returns `null` until `fontsLoaded` is true

## Roadmap

See `docs/improvements-roadmap.md` for the planned phases:
1. ~~Custom MD3 colour palette (light + dark)~~ ✅ Done
2. ~~Tab reorganisation (Progress / Habits / Settings), theme/language/currency~~ ✅ Done
3. ~~Notifications +~~ visual timeline — animated counters done ✅, notifications pending
4. App hardening (TS strictness, Sentry, accessibility)

## Brand

| Token | Value |
|---|---|
| Primary | `#1A6B5C` |
| Hover | `#2A8F7A` |
| Depth | `#12504A` |
| Accent | `#D4922A` |
| App name | So I Quit |
| Scheme | `soiquit` |
