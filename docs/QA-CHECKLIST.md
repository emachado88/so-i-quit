# QA Checklist — So I Quit (Nuxt 4 + Capacitor rewrite)

> Visual contract: `docs/ui-sketch.html` (screens `progress`, `progress-empty`, `habits`,
> `settings`; overlays `wizard-date`, `savings`, `optin`, `delete`).
> Run against the browser dev loop (`npm run dev`) and the Android APK
> (`npm run mobile:apk:preview`). Mark **P**ass / **F**ail / **N**ot-applicable per row.
> Every fix must re-run `npm test`, `npm run lint`, `npx tsc --noEmit` before re-testing.

## 0. Build gates (before any manual QA)

| # | Check | Command | Result |
|---|-------|---------|--------|
| 0.1 | Unit + component tests pass, coverage ≥ 80% (stmts/lines/funcs/branches) | `npm test` | ☐ |
| 0.2 | Lint clean (0 errors, 0 warnings) | `npm run lint` | ☐ |
| 0.3 | TypeScript strict, 0 errors | `npx tsc --noEmit` | ☐ |
| 0.4 | SPA build passes | `npm run build` | ☐ |
| 0.5 | Capacitor sync copies `dist/` into `android/` | `npm run mobile:sync` | ☐ |
| 0.6 | Debug APK builds | `npm run mobile:apk` | ☐ |

## 1. First run (fresh install, no data)

| # | Check | Result |
|---|-------|--------|
| 1.1 | App boots at Progress with the **empty state** ("Ready to get better?" + CTA), no crash | ☐ |
| 1.2 | Language auto-detects from the device (`navigator.language` mapping); persists after restart | ☐ |
| 1.3 | Currency auto-detects from the device region; persists after restart | ☐ |
| 1.4 | Theme follows system (light/dark); no flash of the wrong mode on boot | ☐ |
| 1.5 | Empty-state CTA navigates to Habits | ☐ |

## 2. Habits screen (CRUD + wizard)

| # | Check | Result |
|---|-------|--------|
| 2.1 | Add Alcohol / Tobacco / Custom — each creates a card with the right name | ☐ |
| 2.2 | Custom habit requires a name (Confirm disabled until filled) | ☐ |
| 2.3 | Wizard `date → time → savings`: native Android date/time pickers open; date max = today | ☐ |
| 2.4 | Wizard skip keeps the previous savings value; Save persists and closes | ☐ |
| 2.5 | Card menu: edit date / edit savings / delete — each opens the right dialog with pre-filled values | ☐ |
| 2.6 | **Relapse** (Log relapse) resets date/savings; confirms before acting | ☐ |
| 2.7 | **Delete** shows destructive ConfirmDialog; cancel keeps the card | ☐ |
| 2.8 | After the 1st wizard → milestone **opt-in dialog** appears (Enable / Not now) | ☐ |
| 2.9 | Hardware back steps: savings → datetime → close (wizard); dialogs dismiss on back | ☐ |
| 2.10 | Empty state → Add button still reachable | ☐ |

## 3. Progress screen (counters + ring + celebration)

| # | Check | Result |
|---|-------|--------|
| 3.1 | Live counters tick every second (years/months/days/hours breakdown) | ☐ |
| 3.2 | Milestone ring progress correct vs elapsed time; animates on mount, no full-ring flash | ☐ |
| 3.3 | Next milestone label + target date shown; ring filled to 100% at the milestone | ☐ |
| 3.4 | Total Savings card pinned above the tab bar; value = Σ savings × days, formatted with currency | ☐ |
| 3.5 | Crossing a milestone → celebration toast queues (in-app); multiple crossings queue in order | ☐ |
| 3.6 | With no habits → redirect to Habits (or empty state) — never a blank screen | ☐ |
| 3.7 | Toast gates on app foreground: no toast while backgrounded, toast on resume (if not notified) | ☐ |

## 4. Settings screen

| # | Check | Result |
|---|-------|--------|
| 4.1 | Theme segmented control: System / Light / Dark — flips `html.dark` immediately | ☐ |
| 4.2 | Theme persists across restart (localStorage, WebView-safe) | ☐ |
| 4.3 | Language picker lists 8 locales with native names; switch re-renders the whole app + URL prefix | ☐ |
| 4.4 | Currency picker searchable; shows `Intl` localized names; selection persists | ☐ |
| 4.5 | Milestone notifications toggle reflects the **real OS switch** (toggling in system settings updates it on return) | ☐ |
| 4.6 | Exact-alarm hint shows when exact alarms are denied (Android 12+); "Go to settings" opens the OS screen | ☐ |

## 5. Notifications (device only)

| # | Check | Result |
|---|-------|--------|
| 5.1 | Opt-in "Enable" requests POST_NOTIFICATIONS; if granted + exact denied → ExactAlarmDialog (Skip / Go to settings) | ☐ |
| 5.2 | Schedule a milestone at +2 min → notification fires on time (exact) | ☐ |
| 5.3 | Toggle off cancels pending notifications; toggle on reconciles them | ☐ |
| 5.4 | Tapping a notification opens the app on Progress (incl. cold start) | ☐ |
| 5.5 | OS permission revoked → pending cancelled; restored → reconciled | ☐ |

## 6. Android shell

| # | Check | Result |
|---|-------|--------|
| 6.1 | Layout respects safe areas (notch/nav bar); content never under the tab bar | ☐ |
| 6.2 | Tab bar: Progress / Habits / Settings — navigation + haptic feedback on press | ☐ |
| 6.3 | Hardware back at root exits the app (no phantom history entry) | ☐ |
| 6.4 | Landscape/rotation doesn't break layout (acceptable = usable) | ☐ |
| 6.5 | Haptics: medium on confirms (wizard, save, delete…), success on milestone celebration | ☐ |

## 7. Cross-cutting

| # | Check | Result |
|---|-------|--------|
| 7.1 | Dark mode: every screen + overlay readable (tokens, not hardcoded hex) | ☐ |
| 7.2 | All 8 locales render without missing keys; `{name}` interpolation correct (no `{{name}}` shown) | ☐ |
| 7.3 | Reload mid-flow (wizard open) → app recovers, no stuck overlay | ☐ |
| 7.4 | Corrupt localStorage JSON → Snackbar error, app keeps working (habits) / falls back to defaults (settings) | ☐ |
| 7.5 | Sentry: with `NUXT_PUBLIC_SENTRY_DSN` unset the app behaves identically (no network, no errors) | ☐ |
| 7.6 | A render error in a child screen shows the branded ErrorBoundary fallback + reload works | ☐ |

## 8. Final

- [ ] All F rows fixed and re-verified (tests/lint/tsc re-run)
- [ ] `npm run mobile:apk:preview` installed on a real device — full pass of §2–§6
- [ ] AGENTS.md / README.md reflect the final state (gates, ESLint, QA checklist)
