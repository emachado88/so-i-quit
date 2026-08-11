// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import en from '../../app/i18n/locales/en.json'
import ErrorBoundary from '../../app/components/ui/ErrorBoundary.vue'

// Sentry is mocked so both sides of the boundary are testable: reporting
// when a client exists (DSN configured) and a plain fallback otherwise.
const { sentry } = vi.hoisted(() => ({
  sentry: {
    enabled: true,
    captureException: vi.fn(),
  },
}))

vi.mock('@sentry/vue', () => ({
  captureException: (err: unknown, ctx?: unknown) => {
    sentry.captureException(err, ctx)
  },
  getClient: () => (sentry.enabled ? { id: 'test-client' } : undefined),
}))

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

const GoodChild = { template: '<div data-testid="ok">fine</div>' }
const BadChild = {
  name: 'BadChild',
  setup(): never {
    throw new Error('boom')
  },
  template: '<div />',
}

afterEach(() => {
  vi.clearAllMocks()
  sentry.enabled = true
})

describe('components/ui/ErrorBoundary', () => {
  it('renders the slot when no error occurs', () => {
    const wrapper = mount(ErrorBoundary, {
      slots: { default: GoodChild },
      global: { plugins: [i18n] },
    })

    expect(wrapper.find('[data-testid="ok"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Something went wrong')
    expect(sentry.captureException).not.toHaveBeenCalled()
  })

  it('shows the fallback and reports the error to Sentry', async () => {
    const wrapper = mount(ErrorBoundary, {
      slots: { default: BadChild },
      global: { plugins: [i18n] },
    })
    // The child's setup throws during mount; the boundary re-renders its
    // fallback on the next tick.
    await nextTick()

    expect(wrapper.text()).toContain('Something went wrong')
    expect(wrapper.find('[data-testid="error-detail"]').text()).toBe('boom')
    expect(sentry.captureException).toHaveBeenCalledTimes(1)
    expect(sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ tags: { vueErrorInfo: expect.any(String) } }),
    )
  })

  it('shows the fallback without reporting when Sentry is not configured', async () => {
    sentry.enabled = false
    const wrapper = mount(ErrorBoundary, {
      slots: { default: BadChild },
      global: { plugins: [i18n] },
    })
    await nextTick()

    expect(wrapper.text()).toContain('Something went wrong')
    expect(wrapper.find('[data-testid="error-detail"]').text()).toBe('boom')
    expect(sentry.captureException).not.toHaveBeenCalled()
  })
})
