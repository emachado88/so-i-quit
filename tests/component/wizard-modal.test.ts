// @vitest-environment happy-dom
import { createI18n } from 'vue-i18n'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import en from '../../app/i18n/locales/en.json'
import WizardModal from '../../app/components/habits/WizardModal.vue'
import { installStorageMock } from '../helpers'

// Android platform → the plain native `<input type="date">` branch renders
// (iOS uses the styled overlay wrapper; the input itself is the same).
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'android' },
}))

vi.mock('../../app/utils/back-handler', () => ({
  registerBackHandler: vi.fn(() => () => {}),
}))

installStorageMock()

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en },
})

const mountWizard = (visible = false) =>
  mount(WizardModal, {
    props: {
      visible,
      flow: 'new',
      habitName: 'Alcohol',
      initialSavings: null,
      currency: 'EUR',
      withSavings: true,
    },
    global: { plugins: [i18n] },
  })

describe('WizardModal date max', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-18T09:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('derives the date max from the day the wizard opens', async () => {
    // The wizard is always-mounted and captures `today` at setup. Open it at
    // 09:00 on the 18th → max must be the 18th, not the mount-time day.
    const wrapper = mountWizard(true)
    await nextTick()
    expect(wrapper.get('#wizard-date').attributes('max')).toBe('2026-08-18')
    wrapper.unmount()
  })

  it('refreshes the date max across a midnight boundary', async () => {
    // Mounted before midnight, stays open past midnight, opened after — the
    // previously-captured `today` would pin max to YESTERDAY.
    vi.setSystemTime(new Date('2026-08-17T23:50:00'))
    const wrapper = mountWizard(false)

    vi.setSystemTime(new Date('2026-08-18T00:05:00'))
    await wrapper.setProps({ visible: true })
    await nextTick()

    expect(wrapper.get('#wizard-date').attributes('max')).toBe('2026-08-18')
    wrapper.unmount()
  })
})
