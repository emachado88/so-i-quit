// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { describe, expect, it, vi } from 'vitest'

import en from '../../app/i18n/locales/en.json'
import TabBar from '../../app/components/ui/TabBar.vue'
import { impact } from '../../app/utils/haptics'

// Nuxt-only composables (resolved from `nuxt/app` by the vitest AutoImport
// config) are mocked per test file — the TabBar only needs localePath and
// the current route. The route is hoisted so tests can switch tabs and
// re-mount to assert the pill's position.
const routeMock = vi.hoisted(() => ({ path: '/' }))

vi.mock('nuxt/app', () => ({
  useLocalePath: () => (path: string) => path,
  useRoute: () => routeMock,
}))

// Haptics side effects are mocked; the wrapper has its own unit suite.
vi.mock('../../app/utils/haptics', () => ({
  ImpactStyle: { Heavy: 'HEAVY', Medium: 'MEDIUM', Light: 'LIGHT' },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
  impact: vi.fn(),
  notify: vi.fn(),
  vibrate: vi.fn(),
}))

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

  it('glides the pill under the active tab', () => {
    // The pill is the first direct child of <nav> (track div before <ul>).
    const wrapper = mountTabBar()
    const pill = wrapper.find('nav > div')
    expect(pill.attributes('style')).toContain('translateX(0%)')

    // Re-mount against a different route — the track translates by index.
    wrapper.unmount()
    routeMock.path = '/habits'
    const wrapper2 = mountTabBar()
    expect(wrapper2.find('nav > div').attributes('style')).toContain(
      'translateX(100%)',
    )
  })
})
