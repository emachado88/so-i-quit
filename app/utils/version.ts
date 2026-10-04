/**
 * Version comparison for the in-app update check — pure, dependency-free
 * and node-testable (no `semver` dependency for three functions).
 *
 * Release tags are prefixed (`v1.1.0`) while the installed version comes
 * from package.json (`1.1.0`), so both are normalised before comparing.
 * Only the numeric core is significant; a prerelease suffix (`1.0.0-rc.1`)
 * ranks below its own release, per semver.
 */

/** Strip a leading `v` and surrounding whitespace. */
export const normalizeVersion = (value: string): string =>
  value.trim().replace(/^[vV]/, '')

/** Split a version into its numeric core segments + prerelease text. */
const splitVersion = (value: string): { core: number[], pre: string } => {
  // Build metadata (`+sha`) never affects precedence — drop it.
  const clean = normalizeVersion(value).split('+')[0] ?? ''
  const dash = clean.indexOf('-')
  const coreText = dash === -1 ? clean : clean.slice(0, dash)
  const pre = dash === -1 ? '' : clean.slice(dash + 1)
  const core = coreText.split('.').map((segment) => {
    const parsed = Number.parseInt(segment, 10)
    return Number.isFinite(parsed) ? parsed : 0
  })
  return { core, pre }
}

/**
 * Compare two versions: -1 when `a` is older, 1 when newer, 0 when equal.
 * Missing segments default to 0 (`1.2` === `1.2.0`).
 */
export const compareVersions = (a: string, b: string): number => {
  const left = splitVersion(a)
  const right = splitVersion(b)
  const length = Math.max(left.core.length, right.core.length)
  for (let i = 0; i < length; i += 1) {
    const x = left.core[i] ?? 0
    const y = right.core[i] ?? 0
    if (x !== y) return x < y ? -1 : 1
  }
  // A prerelease ranks below its own release; two prereleases compare as text.
  if (left.pre && !right.pre) return -1
  if (!left.pre && right.pre) return 1
  if (left.pre && right.pre && left.pre !== right.pre) {
    return left.pre < right.pre ? -1 : 1
  }
  return 0
}

/** True when `candidate` is strictly newer than `current`. */
export const isNewerVersion = (candidate: string, current: string): boolean =>
  compareVersions(candidate, current) > 0
