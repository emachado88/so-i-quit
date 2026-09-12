// @vitest-environment happy-dom
import { createI18n } from 'vue-i18n'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, type ComponentPublicInstance } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import en from '../../app/i18n/locales/en.json'
import SavingsModal from '../../app/components/habits/SavingsModal.vue'
import { handleBackButton } from '../../app/utils/back-handler'
import * as haptics from '../../app/utils/haptics'

// Feedback is asserted here; the plugin itself has its own suite.
vi.mock('../../app/utils/haptics', () => ({
  impact: vi.fn(),
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM' },
}))

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en },
})

type ModalWrapper = VueWrapper<ComponentPublicInstance>

interface ModalProps {
  visible: boolean
  value: string | null
  currency?: string
  optional?: boolean
  handleBack?: boolean
}

// Tracked so afterEach can unmount — the modal registers/unregisters a
// hardware-back handler and leaking wrappers would leak into the shared stack.
const wrappers: ModalWrapper[] = []

const mountModal = (props: ModalProps, attachTo?: HTMLElement): ModalWrapper => {
  const wrapper = mount(SavingsModal, {
    props: { currency: 'EUR', ...props },
    global: { plugins: [i18n] },
    ...(attachTo ? { attachTo } : {}),
  })
  wrappers.push(wrapper)
  return wrapper
}

const amountInput = (wrapper: ModalWrapper) => wrapper.get('#savings-amount')

const inputValue = (wrapper: ModalWrapper): string =>
  (amountInput(wrapper).element as HTMLInputElement).value

const buttonByText = (wrapper: ModalWrapper, text: string) =>
  wrapper.findAll('button').find(b => b.text().trim() === text)!

/** Open an always-mounted modal (visible prop flips from false → true). */
const open = async (wrapper: ModalWrapper) => {
  await wrapper.setProps({ visible: true })
  await nextTick()
  await flushPromises()
}

/** Type into the amount field — the input is sanitized on every keystroke. */
const type = async (wrapper: ModalWrapper, text: string) => {
  await amountInput(wrapper).setValue(text)
  await nextTick()
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  document.body.innerHTML = ''
  for (const w of wrappers.splice(0)) w.unmount()
})

describe('components/SavingsModal', () => {
  it('renders nothing while hidden', () => {
    const wrapper = mountModal({ visible: false, value: '3' })
    expect(wrapper.find('#savings-amount').exists()).toBe(false)
  })

  it('pre-fills the current amount on open', async () => {
    const wrapper = mountModal({ visible: false, value: '3.50' })
    await open(wrapper)

    expect(inputValue(wrapper)).toBe('3.50')
    expect(wrapper.text()).toContain('Daily Savings')
    expect(wrapper.text()).toContain('How much do you save per day by quitting?')
    // The currency symbol prefixes the field.
    expect(wrapper.text()).toContain('€')
  })

  it('starts empty when there is no current amount', async () => {
    const wrapper = mountModal({ visible: false, value: null })
    await open(wrapper)

    expect(inputValue(wrapper)).toBe('')
  })

  it('discards unsaved edits when reopened', async () => {
    const wrapper = mountModal({ visible: false, value: '3' })
    await open(wrapper)
    await type(wrapper, '9.99')

    await wrapper.setProps({ visible: false })
    await nextTick()
    await open(wrapper)

    expect(inputValue(wrapper)).toBe('3')
  })

  // ── Auto-focus + focus trap ──

  it('moves focus to the amount input on open and traps Tab inside the dialog', async () => {
    // Attached to document.body so happy-dom actually moves focus (the trap
    // and its restore-on-close are driven by document.activeElement).
    const trigger = document.createElement('button')
    trigger.textContent = 'Edit savings'
    document.body.appendChild(trigger)
    trigger.focus()

    const wrapper = mountModal({ visible: false, value: '3' }, document.body)
    await open(wrapper)

    const dialog = wrapper.get('.fixed.inset-0')
    // Auto-focus: opening lands on the first focusable — the amount input.
    expect(document.activeElement).toBe(amountInput(wrapper).element)

    const focusable = () =>
      Array.from(
        dialog.element.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      )
    const list = focusable()
    expect(list.length).toBeGreaterThan(1)
    const first = list[0]!
    const last = list[list.length - 1]!
    expect(first).toBe(amountInput(wrapper).element)

    // Tab from the last focusable (Confirm) wraps back to the first.
    last.focus()
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
    )
    expect(document.activeElement).toBe(first)

    // Shift+Tab from the first focusable wraps to the last.
    first.focus()
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
    )
    expect(document.activeElement).toBe(last)

    // Closing restores focus to the element that opened the dialog.
    await wrapper.setProps({ visible: false })
    await nextTick()
    expect(document.activeElement).toBe(trigger)
  })

  // ── Input sanitizing ──

  it('strips non-numeric characters and keeps two decimals at most', async () => {
    const wrapper = mountModal({ visible: false, value: null })
    await open(wrapper)

    await type(wrapper, 'abc')
    expect(inputValue(wrapper)).toBe('')

    await type(wrapper, '12.345.6')
    expect(inputValue(wrapper)).toBe('12.34')

    await type(wrapper, '€ 7,5') // comma is not a decimal separator here
    expect(inputValue(wrapper)).toBe('75')
  })

  // ── Edit-savings usage (standalone, no Skip) ──

  it('offers no Skip button and normalizes the amount on save', async () => {
    const wrapper = mountModal({ visible: false, value: '3', handleBack: true })
    await open(wrapper)

    expect(buttonByText(wrapper, 'Skip')).toBeUndefined()
    expect(buttonByText(wrapper, 'Confirm')).toBeDefined()

    await type(wrapper, '7.5')
    await buttonByText(wrapper, 'Confirm').trigger('click')

    expect(wrapper.emitted('save')).toEqual([['7.50']])
    expect(haptics.impact).toHaveBeenCalledWith('MEDIUM')
  })

  it('keeps integers as-is and clears the amount when the field is emptied', async () => {
    const wrapper = mountModal({ visible: false, value: '3' })
    await open(wrapper)

    await type(wrapper, '10')
    await buttonByText(wrapper, 'Confirm').trigger('click')
    expect(wrapper.emitted('save')).toEqual([['10']])

    await type(wrapper, '')
    await buttonByText(wrapper, 'Confirm').trigger('click')
    expect(wrapper.emitted('save')?.at(-1)).toEqual([null])
  })

  // ── Wizard usage (optional) ──

  it('shows Skip and disables Save while the field is empty (optional)', async () => {
    const wrapper = mountModal({ visible: false, value: null, optional: true })
    await open(wrapper)

    expect(wrapper.text()).toContain('Daily Savings (optional)')
    const save = () => buttonByText(wrapper, 'Save')
    expect(save().attributes('disabled')).toBeDefined()

    await type(wrapper, '4')
    expect(save().attributes('disabled')).toBeUndefined()

    await save().trigger('click')
    expect(wrapper.emitted('save')).toEqual([['4']])
  })

  it('Skip keeps the previous value (wizard flow)', async () => {
    const wrapper = mountModal({ visible: false, value: '3.50', optional: true })
    await open(wrapper)

    await type(wrapper, '9')
    await buttonByText(wrapper, 'Skip').trigger('click')

    // The typed value is discarded — the stored amount is re-emitted.
    expect(wrapper.emitted('save')).toEqual([['3.50']])
    expect(haptics.impact).not.toHaveBeenCalled()
  })

  // ── Hardware back (Android) ──

  it('hardware back dismisses the modal when handle-back is set', async () => {
    const wrapper = mountModal({ visible: false, value: '3', handleBack: true })
    await open(wrapper)

    expect(handleBackButton()).toBe(true)
    await nextTick()

    expect(wrapper.emitted('dismiss')).toEqual([[]])
    expect(wrapper.emitted('save')).toBeUndefined()

    // Closing unregisters the handler — back is no longer consumed.
    await wrapper.setProps({ visible: false })
    await nextTick()
    expect(handleBackButton()).toBe(false)
  })

  it('does not consume hardware back without handle-back (wizard usage)', async () => {
    const wrapper = mountModal({ visible: false, value: '3', optional: true })
    await open(wrapper)

    // The wizard owns back handling and steps back itself.
    expect(wrapper.find('#savings-amount').exists()).toBe(true)
    expect(handleBackButton()).toBe(false)
    expect(wrapper.emitted('dismiss')).toBeUndefined()
  })
})
