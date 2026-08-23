#!/usr/bin/env node
// Bump the marketing version across every file that carries it.
//
// Sources kept in sync (package.json is canonical — everything else derives from it):
//   - package.json            version
//   - package-lock.json       root version + packages[""] version (npm ci breaks if these drift)
//   - android/app/build.gradle versionName  (versionCode is derived from it at config time)
//   - ios/.../project.pbxproj MARKETING_VERSION x2 (Debug + Release; Info.plist reads $(MARKETING_VERSION))
//
// Usage:
//   node scripts/bump-version.mjs <newversion>            e.g. 1.2.0
//   node scripts/bump-version.mjs <major|minor|patch>     bumps from current
//   node scripts/bump-version.mjs check                   fail (exit 1) if the four are out of sync
//   node scripts/bump-version.mjs <...> --dry-run         print the edits, change nothing
//
// The iOS build number (CURRENT_PROJECT_VERSION) is intentionally left alone —
// it is the store upload counter and currently a hand-maintained integer; bump it
// separately when you actually upload.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const SEMVER = /^\d+\.\d+\.\d+$/
const dryRun = process.argv.includes('--dry-run')
const args = process.argv.slice(2).filter(a => a !== '--dry-run')
const command = args[0]

function read(rel) {
  return readFileSync(resolve(root, rel), 'utf8')
}
function write(rel, text) {
  if (dryRun) return
  writeFileSync(resolve(root, rel), text)
}
function log(msg) {
  console.log(dryRun ? `[dry-run] ${msg}` : msg)
}

// ---- check mode ---------------------------------------------------------
if (command === 'check') {
  const pkg = JSON.parse(read('package.json')).version
  const lock = read('package-lock.json')
  const lockRoot = lock.match(/"version":\s*"(\d+\.\d+\.\d+)"\s*,\s*\n\s*"lockfileVersion"/)?.[1]
  const lockPkg = lock.match(/"name":\s*"so-i-quit",\s*\n\s*"version":\s*"(\d+\.\d+\.\d+)"/)?.[1]
  const gradle = read('android/app/build.gradle').match(/versionName\s+"(\d+\.\d+\.\d+)"/)?.[1]
  const iosMatches = [...read('ios/App/App.xcodeproj/project.pbxproj').matchAll(/MARKETING_VERSION\s*=\s*(\d+\.\d+\.\d+)\s*;/g)].map(m => m[1])

  const mismatches = []
  if (lockRoot !== pkg) mismatches.push(`package-lock.json (root) is ${lockRoot}, expected ${pkg}`)
  if (lockPkg !== pkg) mismatches.push(`package-lock.json (packages[""]) is ${lockPkg}, expected ${pkg}`)
  if (gradle !== pkg) mismatches.push(`android/app/build.gradle versionName is ${gradle}, expected ${pkg}`)
  if (iosMatches.length === 0) mismatches.push('ios project.pbxproj has no MARKETING_VERSION')
  else if (!iosMatches.every(v => v === pkg)) mismatches.push(`ios project.pbxproj MARKETING_VERSION = [${iosMatches.join(', ')}], expected all ${pkg}`)

  if (mismatches.length) {
    console.error('Version mismatch:')
    for (const m of mismatches) console.error(`  - ${m}`)
    process.exit(1)
  }
  console.log(`Versions in sync at ${pkg} (android versionCode ${versionCode(pkg)}).`)
  process.exit(0)
}

// ---- bump mode ----------------------------------------------------------
function versionCode(semver) {
  return semver.split('.').reduce((acc, v) => acc * 100 + Number(v), 0)
}
function bump(semver, type) {
  const [ma, mi, pa] = semver.split('.').map(Number)
  if (type === 'major') return `${ma + 1}.0.0`
  if (type === 'minor') return `${ma}.${mi + 1}.0`
  if (type === 'patch') return `${ma}.${mi}.${pa + 1}`
  return null
}

const pkg = JSON.parse(read('package.json'))
const current = pkg.version
let next = command
if (['major', 'minor', 'patch'].includes(command)) next = bump(current, command)

if (!next || !SEMVER.test(next)) {
  console.error('Usage: node scripts/bump-version.mjs <newversion|major|minor|patch> [--dry-run]')
  process.exit(1)
}
if (next === current) {
  console.error(`Already at ${current}; nothing to do.`)
  process.exit(1)
}

const edits = []
function stage(file, regex, replacer, label) {
  const text = read(file)
  if (!regex.test(text)) {
    console.error(`Could not find ${label} in ${file} — aborting, no files changed.`)
    process.exit(1)
  }
  const updated = text.replace(regex, replacer)
  edits.push({ file, text, updated })
}

// package.json (re-stringify preserves key order; 2-space indent matches repo style)
pkg.version = next
edits.push({
  file: 'package.json',
  text: read('package.json'),
  updated: JSON.stringify(pkg, null, 2) + '\n',
})

stage('package-lock.json', /("version":\s*)"\d+\.\d+\.\d+"(\s*,\s*\n\s*"lockfileVersion")/, `$1"${next}"$2`, 'root version')
stage('package-lock.json', /("name":\s*"so-i-quit",\s*\n\s*"version":\s*)"\d+\.\d+\.\d+"/, `$1"${next}"`, 'packages[""] version')
stage('android/app/build.gradle', /versionName\s+"\d+\.\d+\.\d+"/, `versionName "${next}"`, 'versionName')
stage('ios/App/App.xcodeproj/project.pbxproj', /\bMARKETING_VERSION\s*=\s*\d+\.\d+\.\d+\s*;/g, `MARKETING_VERSION = ${next};`, 'MARKETING_VERSION')

for (const { file, text, updated } of edits) {
  if (updated !== text) {
    write(file, updated)
    log(`updated ${file}`)
  }
  else {
    log(`unchanged ${file}`)
  }
}

const code = versionCode(next)
console.log(`\n${dryRun ? '[dry-run] ' : ''}Bumped ${current} -> ${next} (android versionCode ${code})`)
if (!dryRun) {
  console.log('Files changed. Review, then commit (and tag if releasing).')
  console.log('  CURRENT_PROJECT_VERSION (iOS build #) left as-is — bump it on upload.')
}
