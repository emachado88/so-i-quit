// @vitest-environment happy-dom
import { createI18n } from 'vue-i18n'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, type ComponentPublicInstance } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import en from '../../app/i18n/locales/en.json'
import NameModal from '../../app/components/habits/NameModal.vue'
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

// Tracked so afterEach can unmount — the modal registers/unregisters a
// hardware-back handler and leaking wrappers would leak into the shared stack.
const wrappers: ModalWrapper[] = []

const mountModal = (
  props: { visible: boolean, value: string | null, handleBack?: boolean } = {
    visible: true,
    value: 'Coffee',
  },
  attachTo?: HTMLElement,
): ModalWrapper => {
  const wrapper = mount(NameModal, {
    props,
    global: { plugins: [i18n] },
    ...(attachTo ? { attachTo } : {}),
  })
  wrappers.push(wrapper)
  return wrapper
}

const nameInput = (wrapper: ModalWrapper) => wrapper.get('#name')

const buttonByText = (wrapper: ModalWrapper, text: string) =>
  wrapper.findAll('button').find(b => b.text().trim() === text)!

/** Open an always-mounted modal (visible prop flips from false → true). */
const open = async (wrapper: ModalWrapper) => {
  await wrapper.setProps({ visible: true })
  await nextTick()
  await flushPromises()
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  document.body.innerHTML = ''
  for (const w of wrappers.splice(0)) w.unmount()
})

describe('components/NameModal', () => {
  it('renders nothing while hidden', () => {
    const wrapper = mountModal({ visible: false, value: 'Coffee' })
    expect(wrapper.find('#name').exists()).toBe(false)
  })

  it('pre-fills the current name on open', async () => {
    const wrapper = mountModal({ visible: false, value: 'Coffee' })
    await open(wrapper)

    expect((nameInput(wrapper).element as HTMLInputElement).value).toBe('Coffee')
    expect(wrapper.text()).toContain('Habit name')
    expect(wrapper.text()).toContain('change the name for Coffee')
  })

  it('discards unsaved edits when reopened', async () => {
    const wrapper = mountModal({ visible: false, value: 'Coffee' })
    await open(wrapper)
    await nameInput(wrapper).setValue('Tea')

    await wrapper.setProps({ visible: false })
    await nextTick()
    await open(wrapper)

    expect((nameInput(wrapper).element as HTMLInputElement).value).toBe('Coffee')
  })

  it('starts with an empty input when there is no current name', async () => {
    const wrapper = mountModal({ visible: false, value: null })
    await open(wrapper)

    expect((nameInput(wrapper).element as HTMLInputElement).value).toBe('')
  })

  it('keeps Confirm disabled until the name actually changes', async () => {
    const wrapper = mountModal({ visible: false, value: 'Coffee' })
    await open(wrapper)

    const confirm = () => buttonByText(wrapper, 'Confirm')
    expect(confirm().attributes('disabled')).toBeDefined()

    // Unchanged value → still disabled.
    await nameInput(wrapper).setValue('Coffee')
    expect(confirm().attributes('disabled')).toBeDefined()

    await nameInput(wrapper).setValue('Tea')
    expect(confirm().attributes('disabled')).toBeUndefined()
  })

  it('trims the name before emitting save', async () => {
    const wrapper = mountModal({ visible: false, value: 'Coffee' })
    await open(wrapper)

    await nameInput(wrapper).setValue('  Tea  ')
    await buttonByText(wrapper, 'Confirm').trigger('click')

    expect(wrapper.emitted('save')).toEqual([['Tea']])
    expect(haptics.impact).toHaveBeenCalledWith('MEDIUM')
  })

  it('refuses a whitespace-only name (no save, light haptic)', async () => {
    const wrapper = mountModal({ visible: false, value: 'Coffee' })
    await open(wrapper)

    await nameInput(wrapper).setValue('   ')
    await buttonByText(wrapper, 'Confirm').trigger('click')

    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.emitted('dismiss')).toBeUndefined()
    expect(haptics.impact).toHaveBeenCalledWith('LIGHT')
  })

  it('Cancel emits dismiss without saving', async () => {
    const wrapper = mountModal({ visible: false, value: 'Coffee' })
    await open(wrapper)

    await nameInput(wrapper).setValue('Tea')
    await buttonByText(wrapper, 'Cancel').trigger('click')

    expect(wrapper.emitted('dismiss')).toEqual([[]])
    expect(wrapper.emitted('save')).toBeUndefined()
  })

  it('traps focus in the dialog and wraps Tab at the boundaries', async () => {
    // Attached to document.body so happy-dom actually moves focus (the trap
    // is driven by document.activeElement).
    const wrapper = mountModal({ visible: false, value: 'Coffee' }, document.body)
    await open(wrapper)

    const dialog = wrapper.get('.fixed.inset-0')
    // Opening moves focus to the first focusable (the name input).
    expect(document.activeElement).toBe(nameInput(wrapper).element)

    // Enable Confirm so the boundary is the last button, not the middle one.
    await nameInput(wrapper).setValue('Tea')
    await nextTick()

    const focusable = () =>
      Array.from(
        dialog.element.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      )
    const list = focusable()
    expect(list.length).toBeGreaterThan(0)
    const first = list[0]!
    const last = list[list.length - 1]!
    expect(first).toBe(nameInput(wrapper).element)

    // Tab from the last focusable wraps back to the first.
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
  })

  it('hardware back dismisses the modal when handle-back is set', async () => {
    const wrapper = mountModal({ visible: false, value: 'Coffee', handleBack: true })
    await open(wrapper)

    expect(handleBackButton()).toBe(true)
    await nextTick()

    expect(wrapper.emitted('dismiss')).toEqual([[]])

    // Closing unregisters the handler — back is no longer consumed.
    await wrapper.setProps({ visible: false })
    await nextTick()
    expect(handleBackButton()).toBe(false)
  })

  it('does not consume hardware back without handle-back (wizard usage)', async () => {
    const wrapper = mountModal({ visible: false, value: 'Coffee', handleBack: false })
    await open(wrapper)

    expect(wrapper.find('#name').exists()).toBe(true)
    expect(handleBackButton()).toBe(false)
    expect(wrapper.emitted('dismiss')).toBeUndefined()
  })
})
