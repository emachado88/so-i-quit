# Build & Release

Gates, version sources, build variants and the CD pipelines. Rules live in `AGENTS.md`; the detail
is here.

## Commands

```bash
npm run dev              # Nuxt dev server (browser dev loop)
npm run build            # SPA build → .output
npm run generate         # SPA generate → dist/ (Capacitor webDir)
npm run lint             # ESLint (flat config, @nuxt/eslint) — 0 errors/warnings
npm run lint:fix         # ESLint --fix
npx tsc --noEmit         # TypeScript check (strict)
npm test                 # vitest run (unit + component) + coverage gate 80%
npx vitest run --coverage  # coverage report
# Mobile (Capacitor)
npm run mobile:sync      # generate + cap sync (android + ios)
npm run mobile:run       # cap run android
npm run mobile:run:ios   # cap run ios (macOS + Xcode only)
npm run mobile:apk       # gradlew assembleDebug
npm run mobile:apk:preview  # gradlew assemblePreview — debug-keystore-signed, for QA/sideload
npm run mobile:apk:release  # gradlew assembleRelease — signed only if android/keystore.properties exists
npm run mobile:live      # cap sync && scripts/live-reload.mjs — LAN IP + CAP_LIVE_URL + cap run android
npm run mobile:icons     # regenerate icon/splash densities
# Version sync
npm run version:bump <1.2.0|major|minor|patch> [--dry-run]
npm run version:check    # fail (exit 1) if the four version sources have drifted
```

## Git hooks & CI

- **Pre-commit (`.husky/pre-commit`)**: `npx lint-staged` (eslint --fix on staged `*.{ts,vue,mjs}`;
  fails fast, no full-lint cost) → `npm test` (full suite + 80% coverage gate, enforced by
  `vitest.config.ts`). If commits feel heavy, the test line can move to a `pre-push` hook — CI gates
  merges regardless. Escape hatch: `git commit --no-verify` (rare).
- **`.github/workflows/ci.yml`** — job **`ci`** on every PR (`pull_request`) + manual
  `workflow_dispatch`: `npm ci` (Node 26, npm cache) → `npm run lint` → `npx tsc --noEmit` →
  `npm test` → `npm run build`. No `push` trigger — everything lands via PR, so a branch push would
  only duplicate the PR run. `concurrency` cancels superseded runs on the same ref.
- **Branch protection on `main`** (PR merge target): required status check `ci`, strict (up-to-date
  before merge), enforced for admins — direct pushes to `main` are rejected, everything lands via PR.
- `prepare: "husky"` (package.json) re-installs the hooks on `npm install`; hooks live in `.husky/`
  (committed, `_/` gitignored).

## CD preview installers (`mobile-preview.yml`)

`workflow_dispatch` only (previews are on-demand — `ci` already gates PRs and macOS runner minutes are
expensive): **android** job (ubuntu) builds `assemblePreview` APK (debug-signed, sideloadable,
`com.soiquit.app.preview`); **ios** job (macos-15) builds an unsigned simulator `.app`. A `platforms`
input (android/ios/both) picks which jobs run.

Artifacts are versioned from package.json (`so-i-quit-<version>-preview.apk` /
`so-i-quit-<version>-simulator.app.tar.gz` — keep package.json in sync with `build.gradle` versionName
+ iOS `MARKETING_VERSION`). **iOS artifact is a single tar.gz, not a zip**: GitHub's download wrapper
strips executable bits (breaking `.app` bundles), so the job ships `App.app` inside one tar.gz
(`upload-artifact` v7 with `archive: false` keeps the raw archive — download →
`tar -xzf so-i-quit-<v>-simulator.app.tar.gz` → `App.app`, permissions/symlinks intact). Signed iOS
device/IPA builds need an Apple Developer account + certificate secrets (not yet wired).

## CD release installers (`mobile-release.yml`)

`workflow_dispatch` only: **android** job (ubuntu) builds `assembleRelease` APK + `bundleRelease` AAB
signed with the upload keystore, which materializes only inside the ephemeral runner from GitHub
secrets (`ANDROID_KEYSTORE_B64` base64 + `ANDROID_KEYSTORE_PASSWORD`/`ANDROID_KEY_ALIAS`/
`ANDROID_KEY_PASSWORD` → `android/so-i-quit-upload.jks` + gitignored `android/keystore.properties`,
then `unset`). Never commit the keystore; keep the original outside the repo. Enable Play App Signing
at publish time so the upload key stays recoverable. An iOS job (signed device IPA, Apple Developer
account + certs) slots in here later. **Release asset = APK only** — the AAB is Play-Store-upload-only,
never made available as a download (AABs can't be sideloaded).

### Cutting a release

1. `npm run version:bump <x.y.z>` and open the bump PR (lands on `main`).
2. Tag and push (`git tag vX.Y.Z && git push origin vX.Y.Z`).
3. Run **Mobile Release** (→ signed APK + AAB) and **Mobile Preview** (→ simulator `.app`) via
   `workflow_dispatch`.
4. Create the GitHub release for the tag as a **draft**, attaching
   `so-i-quit-X.Y.Z-release.apk` (and, by convention, `so-i-quit-X.Y.Z-simulator.app.tar.gz`) — never
   the AAB.
5. Publish once QA passes; the in-app updater only offers **releases** (drafts/prereleases are
   ignored — see `docs/features.md`).

## Version sync

- **`package.json` `version` is the single source of truth.** The app shows it via `nuxt.config.ts`
  (`appVersion: pkg.version` → `useRuntimeConfig().public.appVersion`); `android/app/build.gradle`
  derives `versionCode` from `versionName` at config time; `ios/.../Info.plist` reads
  `$(MARKETING_VERSION)`. Never hand-edit the four in parallel — use the script.
- **`npm run version:bump <new|major|minor|patch>`** writes `package.json` + `package-lock.json`
  (root + `packages[""]` — `npm ci` fails if these drift) + `android/app/build.gradle` `versionName` +
  `ios/.../project.pbxproj` `MARKETING_VERSION` (Debug + Release) in one shot. Add `--dry-run` to
  preview. It does **not** touch `CURRENT_PROJECT_VERSION` (the iOS store build counter) — bump that by
  hand when you actually upload.
- **`npm run version:check`** exits 1 if the four have drifted — wire it into CI (e.g. a step before
  `npm ci`) or a pre-commit guard so a missed platform can't ship.
- The component test `tests/component/settings.test.ts` mocks `appVersion: '1.1.0'` — update that
  literal only if you change the *expected displayed* string, not on every bump.

## Android build variants & signing

Variants: `debug`, `preview` (debug-keystore-signed for sideload/QA), `release` — `mobile:apk:preview`/
`mobile:apk:release` call gradle directly. `release` signs **only** when `android/keystore.properties`
exists (gitignored, read by `build.gradle`; CI writes it from secrets in `mobile-release.yml`) —
otherwise the APK/AAB is unsigned and sideload fails with "package appears to be invalid" (that's the
preview variant's job). iOS has no variants: the CI builds an unsigned simulator `.app`; device/IPA
builds need Apple signing (secrets) — see `mobile-preview.yml`.

## npm install notes

npm 11 blocks esbuild/sharp postinstall — `allowScripts` entries in package.json + `npm rebuild
esbuild` after fresh installs (sharp is needed by @capacitor/assets).
