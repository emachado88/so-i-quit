// @vitest-environment happy-dom
import { createI18n } from 'vue-i18n'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, type ComponentPublicInstance } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'

import en from '../../app/i18n/locales/en.json'
import ExactAlarmDialog from '../../app/components/notifications/ExactAlarmDialog.vue'
import { handleBackButton } from '../../app/utils/back-handler'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en },
})

type DialogWrapper = VueWrapper<ComponentPublicInstance>
const wrappers: DialogWrapper[] = []

const mountDialog = (visible = true): DialogWrapper => {
  const wrapper = mount(ExactAlarmDialog, {
    props: { visible },
    global: { plugins: [i18n] },
  })
  wrappers.push(wrapper)
  return wrapper
}

const buttonByText = (wrapper: DialogWrapper, text: string) =>
  wrapper.findAll('button').find((b) => b.text().trim() === text)

afterEach(() => {
  document.body.innerHTML = ''
  for (const w of wrappers.splice(0)) w.unmount()
})

describe('components/notifications/ExactAlarmDialog', () => {
  it('renders title, body and both actions when visible', () => {
    const wrapper = mountDialog()
    expect(wrapper.text()).toContain('Allow exact alarms?')
    expect(wrapper.text()).toContain('Skip')
    expect(wrapper.text()).toContain('Go to settings')
  })

  it('renders nothing when hidden', () => {
    const wrapper = mountDialog(false)
    expect(wrapper.text()).not.toContain('Allow exact alarms?')
  })

  it('emits skip', async () => {
    const wrapper = mountDialog()
    await buttonByText(wrapper, 'Skip')!.trigger('click')
    expect(wrapper.emitted('skip')).toHaveLength(1)
  })

  it('emits go-settings', async () => {
    const wrapper = mountDialog()
    await buttonByText(wrapper, 'Go to settings')!.trigger('click')
    expect(wrapper.emitted('go-settings')).toHaveLength(1)
  })

  it('hardware back emits skip', async () => {
    const wrapper = mountDialog()
    expect(handleBackButton()).toBe(true)
    await nextTick()
    expect(wrapper.emitted('skip')).toHaveLength(1)
  })
})
