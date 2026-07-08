# So I Quit — Improvement Roadmap

> Spin-off from `analysis-mobile-app-builder.md`. All issues 1.x and 2.x are resolved. This covers the next phase: UI overhaul, tab reorganisation, and engagement features.

---

## 1. UI Overhaul — Custom MD3 Theme

### Goals

- Replace the stock MD3 theme tokens with a custom colour palette (light + dark)
- Every Paper component (Button, Card, TextInput, Snackbar, Divider) inherits the new colours automatically
- No custom component building needed — Paper does the heavy lifting

### Steps

1. **Define colour palette** — user to provide light/dark colour tokens
2. **Map tokens to MD3 colour slots** in `constants/theme.ts`:
   - `primary`, `primaryContainer`, `onPrimary`
   - `secondary`, `secondaryContainer`
   - `surface`, `surfaceVariant`, `background`
   - `error`, `errorContainer`
   - `outline`, `outlineVariant`
   - `inverseOnSurface`, `inversePrimary`
   - etc.
3. **Update `constants/theme.ts`** — replace `...MD3LightTheme` / `...MD3DarkTheme` passthrough with customised theme objects
4. **Verify in-app** — check all screens look right in light + dark mode
5. **Remove unused Paper imports** — only keep what the app actually uses

---

## 2. Settings & Tab Reorganisation

### Current Tab Structure

| Tab   | Name     | Purpose                                      |
| ----- | -------- | -------------------------------------------- |
| Tab 1 | Home     | Counters + total savings                     |
| Tab 2 | Settings | Add/edit/delete habits + date/time + savings |

### Proposed Tab Structure

| Tab   | Name         | Icon                            | Purpose                                                  |
| ----- | ------------ | ------------------------------- | -------------------------------------------------------- |
| Tab 1 | **Progress** | `chart-box-outline` or `trophy` | Updated counters, animated streak display, total savings |
| Tab 2 | **Habits**   | `pen` or `clipboard-list`       | Habit list with date/time pickers + savings per habit    |
| Tab 3 | **Settings** | `cog` or `dots-horizontal`      | App settings: theme, language, currency                  |

**Tab 1 — Progress** (current Home reimagined):

- Quit counters with years/months/days/hours per habit
- Total savings summary card
- Milestone highlights ("3 months smoke-free!")
- Streak visual

**Tab 2 — Habits** (current Settings minus app-config settings):

- List of tracked habits with their quit date + savings
- Add/delete habits
- Edit date/time and savings per habit
- Reset individual habit

**Tab 3 — Settings** (new):

- **Theme**: System / Light / Dark toggle (persisted to AsyncStorage)
- **Language**: i18n selector — read device locale as default, allow override
- **Currency**: configurable symbol (€ default, $, £, etc. — persisted to AsyncStorage)
- About / version info

### Implementation Order

1. Restructure tabs in `app/(tabs)/_layout.tsx` (add 3rd tab, rename existing)
2. Split `settings.tsx` — move habit management to a new `habits.tsx` screen
3. Strip down `settings.tsx` to just app config (theme, language, currency)
4. Implement theme override + persistence
5. Implement i18n wiring + locale detection
6. Implement currency config + format integration

---

## 3. UI/UX Improvements

### Local Notifications / Streak Reminders

Integrate `expo-notifications` for engagement:

- **Daily check-in**: "Have you stuck to it today?" at a configurable time
- **Milestone celebrations**: "1 month free of Alcohol!" / "€100 saved!"
- **Re-engagement nudge**: Push if no app visit in 3 days
- **Permissions flow**: Request notification permission on first launch
- **Scheduling**: Use `expo-notifications` `scheduleNotificationAsync` with trigger conditions

### Visual Timeline / Statistics Screen

Enhance the Progress tab (or a sub-view) with:

- **Animated counter** for total savings — spring animation on mount (React Native Reanimated is already installed)
- **Circular progress** for the longest streak (e.g. a ring that fills up)
- **Horizontal milestone timeline**: "First week" → "1 month" → "€50 saved" → "€100 saved"
- Milestone calculation: derive from quit date + savings per day
- Smooth transitions between values using Reanimated shared values

---

## 📋 Effort Overview

| Item                              | Effort | Dependencies                        |
| --------------------------------- | ------ | ----------------------------------- |
| 1. UI Overhaul — custom MD3 theme | Small  | Colour palette from user            |
| 1.1 Colour palette integration    | Small  | User provides tokens                |
| 2. Tab reorganisation             | Medium | —                                   |
| 2.1 Theme toggle                  | Small  | Light/dark palette from item 1      |
| 2.2 i18n wiring                   | Medium | —                                   |
| 2.3 Currency config               | Small  | `formatAmount` in `utils/format.ts` |
| 3.4 Notifications                 | Medium | `expo-notifications` install        |
| 3.6 Visual timeline               | Medium | Reanimated already installed        |

---

## 🎨 Tab Icons Reference

Using `@expo/vector-icons` (MaterialCommunityIcons):

| Tab      | Icon Name                               | Preview         |
| -------- | --------------------------------------- | --------------- |
| Progress | `chart-box-outline` / `trophy` / `star` | `󰋺` / `󰋻` / `󰋼` |
| Habits   | `clipboard-list-outline` / `pen`        | `󰃁` / `󰏜`       |
| Settings | `cog-outline` / `dots-horizontal`       | `󰒓` / `󰒔`       |

---

_Start: Phase 1 — colour palette + custom components. User provides light/dark colour tokens._

---

## 4. App Hardening

### 4.1 — TypeScript Strictness

`tsconfig.json` already has `"strict": true` but there's low-hanging fruit:

- **Enable `noUnusedLocals` + `noUnusedParameters`** — would have caught the dead `fetch-settings.ts` immediately. Add to `tsconfig.json` and fix the handful of violations.
- **Fix missing React imports** — 4 template-generated files (`external-link.tsx`, `haptic-tab.tsx`, `icon-symbol.ios.tsx`, `icon-symbol.tsx`) error with `TS2686: 'React' refers to a UMD global`. Add `import React` to each.
- **Remove unused imports** — `Text` is imported in both `index.tsx` and `settings.tsx` but only `ThemedText` is used. Clean up.
- **Strictify `useThemeColor` generics** — tighten the generic constraint so invalid colour names are caught at compile time.

### 4.2 — Crash Reporting / Analytics

Zero error tracking means crashes are invisible:

- **Integrate Sentry** (`@sentry/react-native`) — breadcrumbs on habit saves, deletes, and renders. Source maps for symbolicated stack traces.
- **Log meaningful breadcrumbs** — wrap the habit CRUD operations in Sentry breadcrumbs so failures are diagnosable.
- **Alternatively** `expo-crashlytics` if Firebase is preferred — lighter integration with Expo's managed workflow.
- **Start small**: capture unhandled promise rejections + React render errors. Expand to breadcrumbs later.

### 4.3 — Accessibility Audit

Preliminary gaps identified in the analysis:

- **`accessibilityLabel` on delete buttons** — `handleDelete` buttons in habit cards have no label. Add `accessibilityLabel="Delete {habit.name}"`.
- **Tab bar icons** — no accessibility hints. Add `accessibilityHint` to each tab describing its content.
- **Colour contrast** — verify all text/background combos pass WCAG 2.1 AA (contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text). The custom palette from Phase 1 should be validated.
- **TextInput labels** — savings input has `inputMode="numeric"` (good) but no `accessibilityLabel`. Add one.
- **Dynamic type support** — verify all text scales with device font-size settings (rely on RN's default text scaling, ensure no hardcoded font sizes in `StyleSheet` break at larger accessibility sizes).

### Effort Overview

| Item                         | Effort  | Notes                                       |
| ---------------------------- | ------- | ------------------------------------------- |
| 4.1 `noUnusedLocals` + fixes | Small   | 5 min config change + a few import cleanups |
| 4.1 Missing React imports    | Trivial | 4 files, 1 line each                        |
| 4.2 Sentry integration       | Medium  | Requires DSN + build config + testing       |
| 4.3 Accessibility labels     | Small   | 5-10 `accessibilityLabel` attributes        |
| 4.3 Colour contrast check    | Small   | Run palette through contrast checker        |
