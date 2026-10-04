import { describe, expect, it } from 'vitest'

import {
  compareVersions,
  isNewerVersion,
  normalizeVersion,
} from '../../app/utils/version'

describe('utils/version', () => {
  it('normalizes the release-tag prefix and whitespace', () => {
    expect(normalizeVersion(' v1.2.3 ')).toBe('1.2.3')
    expect(normalizeVersion('V2.0.0')).toBe('2.0.0')
    expect(normalizeVersion('1.0.0')).toBe('1.0.0')
  })

  it('compares numeric cores', () => {
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0)
    expect(compareVersions('1.2.3', '1.2.4')).toBe(-1)
    expect(compareVersions('1.3.0', '1.2.9')).toBe(1)
    expect(compareVersions('2.0.0', '1.99.99')).toBe(1)
    expect(compareVersions('0.1.0', '0.2.0')).toBe(-1)
  })

  it('treats missing segments as zero', () => {
    expect(compareVersions('1.2', '1.2.0')).toBe(0)
    expect(compareVersions('1.2', '1.2.1')).toBe(-1)
    expect(compareVersions('1', '1.0.0')).toBe(0)
  })

  it('ignores build metadata', () => {
    expect(compareVersions('1.2.3+build.5', '1.2.3')).toBe(0)
  })

  it('ranks a prerelease below its release', () => {
    expect(compareVersions('1.2.0-rc.1', '1.2.0')).toBe(-1)
    expect(compareVersions('1.2.0', '1.2.0-rc.1')).toBe(1)
    expect(compareVersions('1.2.0-rc.1', '1.2.0-rc.1')).toBe(0)
    expect(compareVersions('1.2.0-rc.1', '1.2.0-rc.2')).toBe(-1)
    expect(compareVersions('1.2.0-rc.2', '1.2.0-rc.1')).toBe(1)
  })

  it('treats a non-numeric segment as zero', () => {
    expect(compareVersions('1.x.0', '1.0.0')).toBe(0)
  })

  it('detects strictly newer versions, tag prefix included', () => {
    // The real case: installed 1.1.0 (package.json), tag v1.1.0 (GitHub).
    expect(isNewerVersion('v1.1.0', '1.1.0')).toBe(false)
    expect(isNewerVersion('v1.1.1', '1.1.0')).toBe(true)
    expect(isNewerVersion('v1.2.0', '1.1.0')).toBe(true)
    expect(isNewerVersion('v1.0.0', '1.1.0')).toBe(false)
  })
})
