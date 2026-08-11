// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { describe, expect, it, vi } from 'vitest'

import en from '../../app/i18n/locales/en.json'
import TabBar from '../../app/components/ui/TabBar.vue'

// Nuxt-only composables (resolved from `nuxt/app` by the vitest AutoImport
// config) are mocked per test file — the TabBar only needs localePath and
// the current route.
vi.mock('nuxt/app', () => ({
  useLocalePath: () => (path: string) => path,
  useRoute: () => ({ path: '/' }),
}))

// Haptics side effects are mocked; the wrapper has its own unit suite.
vi.mock('../../app/utils/haptics', () => ({
  ImpactStyle: { Heavy: 'HEAVY', Medium: 'MEDIUM', Light: 'LIGHT' },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
  impact: vi.fn(),
  notify: vi.fn(),
  vibrate: vi.fn(),
}))

import { impact } from '../../app/utils/haptics'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

const mountTabBar = () =>
  mount(TabBar, {
    global: {
      plugins: [i18n],
      stubs: { NuxtLink: { template: '<a><slot /></a>' } },
    },
  })

describe('components/ui/TabBar', () => {
  it('renders the three tabs', () => {
    const wrapper = mountTabBar()
    expect(wrapper.findAll('a')).toHaveLength(3)
  })

  it('fires a light haptic impact when a tab is pressed', async () => {
    const wrapper = mountTabBar()
    await wrapper.findAll('a')[1].trigger('pointerdown')

    expect(impact).toHaveBeenCalledTimes(1)
    expect(impact).toHaveBeenCalledWith('LIGHT')
  })

  it('highlights the active tab', () => {
    const wrapper = mountTabBar()
    const links = wrapper.findAll('a')
    expect(links[0].classes()).toContain('text-primary')
    expect(links[1].classes()).not.toContain('text-primary')
  })
})
