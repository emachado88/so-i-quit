/**
 * Popover placement math for dropdown menus anchored inside a scroll area.
 *
 * An absolutely positioned menu is clipped by the nearest `overflow-y: auto`
 * ancestor (the page scroll area), so a card near the bottom edge would show
 * a truncated menu — and since the menu contributes no scrollable height
 * (it is out of flow), it cannot be scrolled into view either. The fix is to
 * flip the menu above its trigger when it does not fit below.
 *
 * The measured geometry is passed in so the decision is a pure function
 * (unit-tested without a DOM); the Vue side only reads
 * `getBoundingClientRect()` / `offsetHeight` and applies the result.
 */

/** Gap between the trigger and the menu box (the `mt-1` / `mb-1` utility). */
export const POPOVER_GAP = 4

export interface PopoverGeometry {
  /** Trigger top, in viewport coordinates. */
  triggerTop: number
  /** Trigger bottom, in viewport coordinates. */
  triggerBottom: number
  /** Top of the clipping box (the scroll area), in viewport coordinates. */
  boundaryTop: number
  /** Bottom of the clipping box (the scroll area), in viewport coordinates. */
  boundaryBottom: number
  /** Menu height in layout pixels (`offsetHeight` — transforms excluded). */
  menuHeight: number
}

/**
 * `true` when the menu must open upward: it does not fit below the trigger
 * inside the clipping box AND it does fit above it. When neither side has
 * room the downward placement is kept (the menu is clipped either way; the
 * familiar direction is the better default).
 */
export const opensUpward = ({
  triggerTop,
  triggerBottom,
  boundaryTop,
  boundaryBottom,
  menuHeight,
}: PopoverGeometry): boolean => {
  const fitsBelow = triggerBottom + POPOVER_GAP + menuHeight <= boundaryBottom
  if (fitsBelow) return false
  return triggerTop - POPOVER_GAP - menuHeight >= boundaryTop
}
