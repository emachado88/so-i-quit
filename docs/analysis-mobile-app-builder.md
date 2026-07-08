# 📲 So I Quit — Mobile App Analysis Report

**Agent:** Mobile App Builder (engineering division)
**App:** So I Quit v1.1.0 — Expo/React Native habit tracker
**Date:** July 2026

---

## Executive Summary

"So I Quit" is a clean, focused habit tracker that lets users register what they've quit (Alcohol, Tobacco, custom), track streak in years/months/days/hours, and calculate cumulative savings. The app uses Expo 54 + RN 0.81 with the New Architecture enabled, react-native-paper (MD3), AsyncStorage for persistence, and file-based routing via expo-router. It's a small codebase (18 source files) with one main flow: Settings → manage habits → Stats dashboard.

The app works. But as it stands, it has significant **technical debt from its quick-start origins**, several **bugs in production paths**, and **missed opportunities** for a genuinely polished mobile-native experience.

---

## 1️⃣ Issues (Bugs & Functional Problems)

### 🔴 1.1 — `index.tsx`: Infinite polling loop when not focused

**File:** `app/(tabs)/index.tsx` (lines 65–71)

```ts
useEffect(() => {
  if (!isFocused) return; // ← guard
  loadHabits();
  const interval = setInterval(loadHabits, 1000);
  return () => clearInterval(interval);
}, [isFocused]);
```

The guard on line 66 only prevents the **first** load when unfocused, but `setInterval` is **always scheduled** on mount if `isFocused` is true — and the cleanup only runs when `isFocused` changes. If the user navigates to Settings and back repeatedly, stale intervals pile up. The previous commit `7cbb485` tried to fix this but it's not correct: the interval callback runs even after the user has left the tab for that `isFocused=true` window. A 1-second poll also drains battery unnecessarily — data is local AsyncStorage, not a remote API.

**Severity:** Medium — battery drain + potential stale data display.

### 🔴 1.2 — `settings.tsx`: Android-only date picker; iOS crash

**File:** `app/(tabs)/settings.tsx` (lines 197–205, 219–228)

```ts
DateTimePickerAndroid.open({...})
```

`DateTimePickerAndroid.open()` only works on Android. On iOS this will cause a **runtime crash** (`undefined is not a function` or similar). The `@react-native-community/datetimepicker` package requires entirely different APIs per platform (`open` on Android vs. rendering a `<DateTimePicker>` component on iOS).

**Severity:** **Critical** — app crashes on iOS when tapping date/time edit.

### 🔴 1.3 — `index.tsx`: `parsing` typo hides function error (Potential crash)

**File:** `app/(tabs)/index.tsx` (line 97) — commit `b6ab5cc` confirms "parsing" was the old name but never surfaced as an issue because of...

**Severity:** Cosmetic (already fixed in git history), but points to lack of test coverage.

### 🔴 1.4 — No error boundary / graceful crash handling

If AsyncStorage throws (corrupted data, storage full), the app either returns an empty array or silently ignores the error. No user-facing feedback.

**Severity:** Low-Medium — hard to diagnose for users.

### 🔴 1.5 — `fetch-settings.ts` is dead/legacy code

**File:** `utils/fetch-settings.ts`

This file references old `soberDate` / `soberSavings` / `smokeDate` / `smokeSavings` keys — a legacy from the hardcoded-habits era (before commit `1d1db30`). It's **imported nowhere** and its key naming doesn't match the current dynamic habits system. Orphan code.

**Severity:** Low — clutter, but no runtime impact.

---

## 2️⃣ Refactoring (Technical Debt)

### 🟡 2.1 — Deeply nested component imports from react-native-paper internals

Multiple files import from deep paths like:

```ts
import Card from "react-native-paper/src/components/Card/Card"; // index.tsx, settings.tsx
import Button from "react-native-paper/src/components/Button/Button"; // settings.tsx
import TextInput from "react-native-paper/src/components/TextInput/TextInput"; // settings.tsx
import Divider from "react-native-paper/src/components/Divider"; // settings.tsx
import PaperProvider from "react-native-paper/src/core/PaperProvider"; // _layout.tsx
```

These bypass the package's public API surface. This is **brittle** — any patch update of react-native-paper could break imports if internal paths change. This was likely done to work around tree-shaking or import issues (Expo's Metro bundler sometimes struggles with barrel exports), but it couples the app to library internals.

**Fix:** Import from the public barrel: `import { Card, Button, TextInput, Divider, PaperProvider } from "react-native-paper"` and verify Metro's tree-shaking config.

### 🟡 2.2 — Duplicated `useColorScheme` abstraction

**Files:**

- `hooks/use-color-scheme.ts` — wraps RN's hook with SSR hydration (web)
- `hooks/use-color-scheme.web.ts` — identical pass-through to RN's hook
- `hooks/use-theme-color.ts` — third layer that calls `useColorScheme` + looks up `Colors` map

Three files to determine "light" or "dark". The web version exists because of the hydration guard. This could be collapsed: `use-theme-color.ts` can import `useColorScheme()` directly from RN (it already handles SSR). The `.web.ts` file is redundant when the non-web file already handles hydration.

### 🟡 2.3 — Inline styles everywhere / no `StyleSheet.create`

Most styles in both `index.tsx` and `settings.tsx` are inline objects:

```tsx
<View style={{ flexDirection: "row", justifyContent: "center", gap: 10 }}>
```

This is a React Native anti-pattern — inline styles are recreated on every render, bypass memoization, and make the component harder to read. Only `constants/styles.ts` uses `StyleSheet.create()` with just 2 rules.

### 🟡 2.4 — `globalStyles` is underused / misnamed

`constants/styles.ts`:

```ts
export const globalStyles = StyleSheet.create({
  container: { padding: 20 },
  shadow: { boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.1)" },
});
```

The `shadow` key uses `boxShadow` (a web-only CSS property) which has no effect on iOS/Android native — they require separate `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`, `elevation` properties. On mobile this produces no shadow.

### 🟡 2.5 — Duplicated date-time helpers across screens

Both `index.tsx` (lines 22–54) and `settings.tsx` contain:

- `daysSince(isoDate)` — index only
- `breakdown(isoDate)` → `{years, months, days, hours}` — index only
- `parseSavings(value)` — index only
- `formatAmount(value)` — index only
- Similar date formatting (`.toLocaleDateString()`, `.toLocaleTimeString()`) — settings only

These should be extracted into `utils/habits.ts` or a new `utils/format.ts` to DRY them up.

### 🟡 2.6 — `id` generation is `Date.now().toString()`

**File:** `utils/habits.ts` (line 28)

```ts
id: Date.now().toString(),
```

This is not collision-resistant if two habits are added in the same millisecond. Use `crypto.randomUUID()` or `expo-crypto`'s `uuidv4()`.

### 🟡 2.7 — No type safety on habit creation

**File:** `utils/habits.ts` (function signature)

```ts
export const addHabit = async (habit: Omit<Habit, "id">): Promise<Habit>
```

This accepts any partial habit without runtime validation. There should be a `zod` schema or at least basic validation before writing to storage.

### 🟡 2.8 — `useIsFocused` + `useNavigation` from `@react-navigation/` instead of expo-router's hooks

**File:** `app/(tabs)/index.tsx`

```ts
import { useIsFocused } from "@react-navigation/core";
import { useNavigation } from "@react-navigation/native";
```

Since this is an expo-router project, the idiomatic approach is `import { useFocusEffect } from "expo-router"` or `import { useNavigation } from "expo-router"`. Mixing navigation packages is confusing and risks version incompatibility.

---

## 3️⃣ Improvements (Feature & UX Recommendations)

### 🟢 3.1 — Replace the 1-second poll with an event-driven refresh

**Current:** Polls AsyncStorage every second with `setInterval`.
**Recommended:** Use `useFocusEffect` from expo-router to load habits only when the screen gains focus. No interval needed — data only changes from Settings, so a focus-gained trigger is sufficient.

```ts
useFocusEffect(
  useCallback(() => {
    loadHabits();
  }, []),
);
```

↳ _Bonus: add a listener for AsyncStorage changes if you want cross-tab reactivity._

### 🟢 3.2 — Proper cross-platform date/time picker

Android uses `DateTimePickerAndroid.open()`, but iOS requires rendering a `<DateTimePicker>` component. The proper pattern:

```tsx
{Platform.OS === 'ios' ? (
  <DateTimePicker
    value={pickDate}
    mode="date"
    onChange={onChange}
  />
) : Platform.OS === 'android' ? (
  // Button → DateTimePickerAndroid.open(...)
) : null}
```

Or use `expo-date-time-picker` if available. Without this, iOS users cannot set dates.

### 🟢 3.3 — Migrate from AsyncStorage to a proper lightweight database

AsyncStorage is fine for tiny payloads, but habits with timestamps and financial savings are better served by:

- **expo-sqlite** (built-in, native, fast)
- **react-native-mmkv** (fastest key-value, synchronous)

This would also enable richer queries (sort by date, filter, aggregate across periods) without loading the whole array.

---

## ✅ Done until here

### 🟢 3.4 — Add local notifications / streak reminders

The app has no persistent engagement mechanism. Basic `expo-notifications` setup with:

- Daily reminder: "Have you stuck to it today?"
- Milestone celebrations: "1 month free of Alcohol!"
- Nudge if no visit in 3 days

This is the highest-leverage engagement feature for a quit-habit tracker.

### 🟢 3.5 — Dark/light mode toggle in Settings

Currently respects system preference only. Users should be able to override it in-app (with AsyncStorage persistence of the preference). This is a paper cut that repeatedly comes up in MD3 apps.

### 🟢 3.6 — Carousel / visual timeline on the Stats screen

Instead of a flat list of cards, consider:

- A big **circular progress** for the longest streak
- An **animated counter** for total savings (spring animation on mount)
- A **horizontal timeline** showing milestones ("First week", "1 month", "€100 saved")

React Native Reanimated is already installed — it's currently unused in the actual UI.

### 🟢 3.7 — TypeScript strictness improvements

`tsconfig.json` has `"strict": true` already, but:

- Several components are missing React import (causing TS errors in 4 files)
- `fetch-settings.ts` has `any` types in its callback signature
- `useThemeColor` could have stricter generics

A `tsconfig.json` with `"noUnusedLocals": true` and `"noUnusedParameters": true` would have immediately flagged the dead `fetch-settings.ts`.

### 🟢 3.8 — i18n / localization

`dayjs.locale("pt")` is hardcoded in `_layout.tsx`. If the app targets a Portuguese-speaking audience, that's fine — but it should be derived from device locale, not hardcoded.

### 🟢 3.9 — Analytics / crash reporting

Zero error tracking. Given the iOS crash from the date picker (Issue 1.2), at minimum:

- Integrate `expo-crashlytics` or Sentry
- Log meaningful breadcrumbs on habit save/delete

### 🟢 3.10 — Accessibility audit

Preliminary observations:

- No `accessibilityLabel` on the delete buttons in habit cards
- Tab bar icons have no accessibility hints
- Color contrast should be verified against WCAG 2.1 AA
- `TextInput` for savings has `inputMode="numeric"` (good), but no `accessibilityLabel`

---

## 📊 Priority Matrix

| Category        | Item                                       | Severity    | Effort  |
| --------------- | ------------------------------------------ | ----------- | ------- |
| **Bug**         | iOS crash on date picker (1.2)             | 🔴 Critical | Small   |
| **Bug**         | Interval leak / battery drain (1.1)        | 🔴 High     | Small   |
| **Bug**         | Dead code fetch-settings.ts (1.5)          | 🟡 Low      | Trivial |
| **Tech Debt**   | Deep imports from RN Paper internals (2.1) | 🟡 Medium   | Medium  |
| **Tech Debt**   | Inline styles not using StyleSheet (2.3)   | 🟡 Low      | Medium  |
| **Tech Debt**   | `Date.now()` as ID (2.6)                   | 🟡 Low      | Trivial |
| **Tech Debt**   | Duplicated helpers (2.5)                   | 🟡 Low      | Small   |
| **Improvement** | Event-driven refresh (3.1)                 | 🟢 Medium   | Small   |
| **Improvement** | Notifications / streaks (3.4)              | 🟢 High     | Medium  |
| **Improvement** | Visual timeline / animations (3.6)         | 🟢 Medium   | Medium  |

---

## Final Verdict

The app's **core concept is solid** — minimal, focused, does one thing well. The recent dynamic-habits refactor shows good architectural thinking. However, the codebase carries clear signs of being built with Expo's default template and never fully cleaned up:

- Cross-platform concerns were an afterthought (iOS date picker **will crash**)
- Performance optimization was swapped for simplicity (1-second poll vs. event-driven)
- Business logic leaks into the view layer (date math in the component)
- Internal RN Paper imports suggest fighting with bundler configuration rather than addressing it

**Recommended immediate actions:**

1. Fix the iOS date picker crash — this is a **ship-blocker** for iOS
2. Kill the 1-second interval; use `useFocusEffect`
3. Extract shared date helpers to `utils/`
4. Remove dead `fetch-settings.ts`
5. Import RN Paper from the public barrel
6. Consolidate the color-scheme hooks into one file

These 6 fixes would resolve all critical bugs and ~60% of the tech debt in under a day of focused work.
