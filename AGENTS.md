# AGENTS.md

## Project Overview

A React Native (Expo) habit tracker that counts time since quitting and calculates accumulated savings. Local-only, no backend. The app is currently mid-refactor: react-native-paper is being replaced with custom components (see roadmap).

## Tech Stack

- **Expo SDK 54** + **React Native 0.81** (new architecture enabled)
- **Expo Router v6** — file-based routing under `app/`
- **TypeScript 5.9** — strict mode
- **react-native-paper** (being phased out) — Card, Button, TextInput, Snackbar, Divider
- **dayjs** — date manipulation (locale: pt)
- **@react-native-async-storage/async-storage** — persistence
- **react-native-reanimated v4** — animations
- **@react-native-community/datetimepicker** — native date/time pickers

## Project Structure

```
app/                     # Expo Router pages (file-based)
  (tabs)/
    _layout.tsx          # Tab bar (2 tabs: index, settings)
    index.tsx            # Home — live counters, savings summary
    settings.tsx         # Habit CRUD — date/time pickers, savings input
  _layout.tsx            # Root — PaperProvider, StatusBar, dayjs locale
components/
  themed-text.tsx        # ThemedText component (title/subtitle/default/link)
  haptic-tab.tsx         # Tab button with haptic feedback
  ui/
    icon-symbol.tsx      # SF Symbols wrapper (iOS) / fallback
    icon-symbol.ios.tsx  # iOS-specific SF Symbols
  external-link.tsx      # External link helper (template boilerplate)
constants/
  interfaces.ts          # Habit { id, name, date, savings }
  styles.ts              # globalStyles: container, shadow, flex1
  theme.ts               # Colors (light/dark), themes (MD3LightTheme/MD3DarkTheme)
hooks/
  use-color-scheme.ts    # SSR-safe re-export of RN's useColorScheme
  use-theme-color.ts     # Resolves {light,dark} colour from Colors map
utils/
  habits.ts              # AsyncStorage CRUD (getHabits, addHabit, updateHabit, deleteHabit, saveHabits)
  format.ts              # daysSince, breakdown, parseSavings, formatAmount
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
- Shared styles in `constants/styles.ts` (`globalStyles.container`, `globalStyles.flex1`)
- No `StyleSheet.flatten` — use array syntax: `style={[base, custom]}`

### State & Effects
- `useFocusEffect` from expo-router for data loading on focus (not `useEffect`)
- No polling — tick intervals inside `useFocusEffect` for live counters, cleanup handled automatically
- `const [, setTick] = useState(0)` for re-render triggers (no storage reads on tick)

### Data Layer
- Errors propagate from `utils/habits.ts` — screens catch and show Snackbar
- IDs: timestamp + random suffix: `` `${Date.now()}-${Math.random().toString(36).substring(2, 11)}` ``
- AsyncStorage key: `"habits"` (JSON array of Habit objects)

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
- Phase-out is in progress (see roadmap)

### AsyncStorage Error Handling
- `utils/habits.ts` functions do NOT catch internally — errors propagate to callers
- Screens wrap calls in try/catch and show errors via Snackbar
- This was intentional (fixes silent data loss from 1.4)

### Live Counter Ticks
- The breakdown display must update in real time (years/months/days/hours since quit)
- Solution: lightweight `setInterval(() => setTick(t => t + 1), 1000)` inside `useFocusEffect`
- Re-render only — no storage I/O on ticks (the quit date is cached in state)

## Roadmap

See `docs/improvements-roadmap.md` for the planned phases:
1. Drop react-native-paper, custom colour palette
2. Tab reorganisation (Progress / Habits / Settings), theme/language/currency
3. Notifications + visual timeline
4. App hardening (TS strictness, Sentry, accessibility)

## Brand

| Token | Value |
|---|---|
| Primary (splash bg) | `#0D4A3F` |
| Accent (graph stroke) | `#2A8A77` |
| App name | So I Quit |
| Scheme | `soiquit` |
