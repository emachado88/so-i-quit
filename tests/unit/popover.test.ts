import { describe, expect, it } from 'vitest'

import { opensUpward, POPOVER_GAP } from '../../app/utils/popover'

/**
 * Geometry of a dropdown that opens below a trigger inside a clipping box
 * (the page scroll area). Defaults fit comfortably; tests move the edges.
 */
const geometry = (overrides: Partial<Parameters<typeof opensUpward>[0]> = {}) => ({
  triggerTop: 300,
  triggerBottom: 330,
  boundaryTop: 0,
  boundaryBottom: 600,
  menuHeight: 200,
  ...overrides,
})

describe('utils/popover', () => {
  it('keeps the menu below the trigger while it fits inside the boundary', () => {
    expect(opensUpward(geometry())).toBe(false)
  })

  it('keeps the downward placement when the menu fits exactly', () => {
    // 130 + 4 + 200 === 334 === the boundary.
    expect(
      opensUpward(
        geometry({ triggerTop: 100, triggerBottom: 130, boundaryBottom: 334 }),
      ),
    ).toBe(false)
  })

  it('flips the menu above the trigger when it would overflow below', () => {
    // Trigger sits low: 430 + 4 + 200 = 634 > 400, and there is room above.
    expect(
      opensUpward(
        geometry({ triggerTop: 400, triggerBottom: 430, boundaryBottom: 400 }),
      ),
    ).toBe(true)
  })

  it('keeps the downward placement when neither side has room', () => {
    // No room below AND not enough room above the trigger — staying down is
    // the familiar direction, and flipping would clip at the top instead.
    expect(
      opensUpward(
        geometry({ triggerTop: 100, triggerBottom: 130, boundaryBottom: 200 }),
      ),
    ).toBe(false)
  })

  it('counts the gap between the trigger and the menu', () => {
    expect(POPOVER_GAP).toBe(4)
    // The menu alone would fit (300 + 196 = 496 ≤ 499) — the 4px gap is what
    // tips it over (500 > 499) → flip.
    expect(
      opensUpward(
        geometry({ triggerBottom: 300, boundaryBottom: 499, menuHeight: 196 }),
      ),
    ).toBe(true)
  })
})
