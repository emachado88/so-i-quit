# UI, Shell & Scrolling

How the shell is laid out and why the scroll/transition/overlay behaviours are what they are.
Rules live in `AGENTS.md`; this is the reasoning and the traps.

## The document never scrolls

- `layouts/default.vue` is a fixed-height column (`flex h-full flex-col overflow-hidden`) with
  `html, body { height: 100%; overflow: hidden }` and `#__nuxt { height: 100% }` — without the
  `#__nuxt` rule the shell falls back to `auto` and the pinned savings card floats mid-screen
  (measured). Each page owns its own scroll area instead, so the title never moves and switching
  tabs always opens at the top.
- Page skeleton: pinned `<header>` (+ the Habits add-chips) → top shadow band → scroll area → bottom
  shadow band → (Progress) the Total Savings card as the last flex item, landing exactly on the
  TabBar (`main` carries `pb-[calc(4rem+env(safe-area-inset-bottom,0px))]`, 4rem = the TabBar's height).
- **`[&>*]:shrink-0` on every scroller is load-bearing:** flex children shrink by default, so 10
  habits collapsed every `<article>` to 46 px and `scrollHeight === clientHeight` (measured — the
  "cut cards" bug). Keep it when adding a scroller.
- Scroller contract: `scroll-shadows min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4` +
  `data-testid="page-scroller"` (the structural-test hook). Never a trailing `pb-*`: padding is not
  content, so it would land outside the bottom mask and desync it — the trailing breathing room
  *is* the mask.

### Scroll shadows are two layers

Not the `background-attachment: local/scroll` recipe. That recipe (CSS-Tricks classic, tried first)
paints the shadow as a *background of the scroller*, i.e. **behind** the content — the demo reads
well because its content is text, but over an opaque full-width card only a ~2 px band at the
card's edge is visible (measured), i.e. "the shadow only shows over the page background". So the
cover+shadow pair moved from backgrounds to elements: `.casts-scroll-shadow` (band between header
and scroller) / `.casts-scroll-shadow-up` (band overlapping the scroller's tail through a negative
top margin, so it costs no layout space) + `.scroll-shadows::before/::after` (opaque
page-background masks stacked *above* them — `::before` absolute at the content's top, so it scrolls
away; `::after` the last content item). No JS, no scroll listeners, no state.

- Mask (`z-20`) must stay above cast (`z-10`), both positioned. The `::after` mask also needs
  `flex-grow: 1`, so a page with nothing to scroll still masks the bottom band (without it Settings
  showed a phantom bottom shadow — measured).
- Do not chase the end-of-scroll hairline with a `transform` on the mask: a transformed box extends
  the scrollable overflow, so the range grows by the same amount and the hairline moves with it
  (measured). Known limit: at the very end of the scroll the bottom band can leave a ~1 px hairline,
  because Chromium's integer scroll range can over-scroll by the fractional part of `scrollHeight`.
  Fading the band's tail hides it but then the shadow reads as stopping ~1 px short of the next
  element — flush against that element wins.
- Milestone chips scroll fade uses a **pseudo-element** (`::after` gradient), not an overlay element.

### HabitMenu dropdown flip

`app/utils/popover.ts` holds the pure geometry (`opensUpward(trigger, panel, viewport)`,
`POPOVER_GAP`) and the component measures against its nearest scroll area (`findScrollArea()`).

## Page transitions & entrances (Combo A)

- **Crossfade, `out-in`**: `app.vue` passes `<NuxtPage :transition="{ name: 'page', mode: 'out-in' }" />`;
  the `page-*` classes live in `main.css`. **Opacity-only on purpose** — a transform/filter on the
  page root would make it the containing block of fixed descendants, so the pinned TotalSavingsCard
  on Progress would jump mid-animation. `out-in` keeps one page mounted at a time (pages never
  stack), at the cost of a quick bg-colour blink between phases (invisible — pages are transparent
  over the shell bg).
- **Staggered card entrance**: `.enter-rise` (rise-in keyframes: fade + 10px rise, 350ms
  `cubic-bezier(0.16,1,0.3,1)`, `backwards` fill so delayed cards stay hidden during their wait).
  Applied with an inline `animation-delay` of `index * 45ms` on page mounts: header 0ms → chips 45ms
  → cards 90ms+ → pinned savings card 90ms. Runs once per mount (CSS animations don't replay on
  re-render; keyed v-for keeps them inert on list edits). **Gotcha:** fill mode is `backwards`, never
  `both`/`forwards` — a finished fill-mode animation stays applied and keeps every card a permanent
  stacking context, which trapped the habit-menu dropdown (absolute z-50) behind the next card (a
  sibling stacking context later in DOM order).
- **TabBar sliding pill**: a `w-1/3` track absolutely positioned in the fixed nav,
  `translateX(activeIndex * 100%)` with `transition-transform duration-300` — glides between tabs;
  the pill visual inside carries the `mx-2` margins so the translate stays cell-aligned. Boot always
  lands on tab 0 (root URL), so no initial slide.
- **HabitMenu dropdown**: same zoom language as the modals at smaller amplitude — `<Transition>` fade
  + `scale-95 → 100`, `origin-top-right` (grows from the ⋮ button), `duration-150 ease-out` enter /
  `duration-100 ease-in` leave, `motion-reduce:transition-none`.
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` in `main.css` kills the page
  transition and `enter-rise`; the pill uses `motion-reduce:transition-none` (Tailwind variant).
- Locale switches on the same page (e.g. `/pt` → `/en` on Settings) reuse the page component — no
  remount, no transition (text updates in place); that is intentional.

## Modals & overlay z-scale

- **Overlay z-scale (single source):** `z-50` TabBar → `z-[60]` modal layer (every `fixed inset-0`
  backdrop: wizard, savings, name, confirm/relapse, opt-in, exact-alarm, lang/currency pickers — plus
  the HabitMenu scrim + dropdown) → `z-[70]` transient feedback (Snackbar, CelebrationToast).
  Everything above the TabBar blocks it by design: a modal backdrop covers the tab strip, so the
  modal's own buttons are the only way out. Never add a new `z-50` overlay — it ties with the TabBar
  and, being earlier in DOM order, paints under it. (The scroll-shadow mask/cast pair is a *separate*
  local scale, `z-20`/`z-10` inside the page flow — not part of the overlay scale. The update banner
  is **in-flow** at the top of the shell, so it carries no z-index at all and can never tie with this
  scale.)
- **Modals are always-mounted + `visible` prop** (never `v-if` at the call site — an unmounted
  component can't play its leave animation). Each modal owns a `<Transition>` around its backdrop
  root: enter `opacity-0 scale-105 → opacity-100 scale-100` (zoom out-in), leave the reverse (zoom
  in-out), `duration-200 ease-out` / `duration-150 ease-in` — Tailwind utilities, no CSS.
  `ConfirmDialog` follows the same pattern (`visible` prop + watch-based back handler). Note Tailwind
  v4 `scale-*` uses the CSS `scale` property — the `transition` utility covers it, arbitrary
  `transition-[…]` lists do not.
- **Sanitized inputs must write back to the DOM element:** `SavingsModal` keeps the amount in
  `localValue` and renders `:value="localValue"`, but Vue skips patching an unchanged value — typing
  `abc` into an empty field (or a 3rd decimal once the limit is hit) sanitizes to the string the state
  already holds, so nothing re-renders and the rejected characters stay on screen while the state
  disagrees with the field. `handleInput` writes the sanitized text back to `event.target.value`
  before updating the ref. Any controlled input with a value transform needs that write-back.

## Pinned savings card

The Total Savings card is the **last flex item** of the page column (not `fixed`, no `z-40`), with
the scroll area above it taking the remaining height; it lands flush on the TabBar thanks to the
layout `main`'s bottom padding.

## Hardware back button (Android)

- Android-only: iOS has no hardware back button (`App.addListener('backButton')` never fires there —
  the listener is a safe no-op; the iOS system swipe-back gestures are handled by the WebView
  natively).
- The WebView does **not** navigate history on back: without a `backButton` listener the OS default
  applies and the app is sent to the background even when the router can go back. A root listener in
  `app.vue` resolves every press: overlays first → `router.back()` → `App.exitApp()`.
- Overlays register a handler in a **LIFO stack** (`app/utils/back-handler.ts`, RN `BackHandler`-style)
  while visible: the wizard steps back (savings→datetime→cancel), `ConfirmDialog` dismisses (covers
  delete + relapse), `NameModal`/`SavingsModal`/pickers/opt-in/menu close. `handleBackButton()` is
  called by the root listener and by component tests.
- `SavingsModal` and `NameModal` take a `handle-back` prop because the wizard renders `SavingsModal`
  for its savings step and owns back handling itself (step back, not dismiss); the always-mounted
  instances on the Habits screen pass it, so back dismisses them like Cancel.
- `canGoBack` comes from the native event (WebView history). Tab switches push history via `NuxtLink`,
  so back walks the tabs; at the root it exits.
- The i18n boot redirect uses `navigateTo(..., { replace: true })` — a push would leave a phantom `/`
  entry making the first back press bounce instead of exit.

## Native date/time inputs

- `<input type="date">` / `<input type="time">` open the native pickers inside the WebView (Android
  and iOS) — the wizard is a stepper modal with native inputs, `max="today"` via the `max` attribute.
  The iOS-safe CSS in `main.css` hides Chromium-only spinner pseudo-elements (excluded on iOS via
  `@supports not (-webkit-touch-callout: none)`).
- **iOS uses an overlay pattern, not CSS**: WKWebView renders temporal inputs from UA shadow-DOM rules
  that are NOT stylable — `::-webkit-datetime-edit*` pseudo-element rules are dead in the WebView
  (verified with colored probes: input-level rules apply, pseudo rules don't) and the intrinsic sizing
  differs per iOS version (18: tiny/date≠time widths; 26: oversized/overflowing). `WizardModal.vue`
  therefore renders, on iOS only (`Capacitor.getPlatform() === 'ios'`), an invisible native input
  (`absolute inset-0 opacity-0` — keeps the picker + v-model + max) stretched over a styled div that
  shows the value via `Intl` (2-digit pattern; components-built Date to avoid UTC day-shift).
  Android/browser keep the plain native input.
- **Never `appearance: none` on iOS** — it disables tap-to-open the picker.

## Milestone ring animation

- Fill is driven by the **Web Animations API** (`el.animate` on `strokeDashoffset`), not CSS
  transitions — Chromium starts SVG presentation-attribute transitions from 0 on insert ("shrink from
  100%" flash), and they can be swallowed if the attribute lands before first paint.
- The ring mounts empty and animates up; data arriving later re-animates from the current offset
  (no full-ring flash).
- Test selector for the fill bar: `circle.stroke-primary-hover` (the class is a token, `stroke-success`
  was renamed).

## Viewport & zoom

WebView zoom is disabled on purpose — the viewport in `nuxt.config.ts` carries
`maximum-scale=1, user-scalable=no` + `touch-action: manipulation` in `main.css` (kills pinch AND
double-tap zoom). Safari ignores `user-scalable=no` since iOS 10, but **WKWebView honors it** — do
not remove these "because Safari ignores them", the WebView is the product.
