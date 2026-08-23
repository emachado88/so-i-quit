// Unit tests for the hardware-back handler wrapper.
//
// The Capacitor plugins are mocked at the module boundary; the wrapper
// itself is real. Two platform scenarios:
//   - native (Capacitor.isNativePlatform() → true): plugin calls flow through
//   - browser (false): every function is a no-op
//
// The wrapper keeps the handler stack at module level, so each test reloads
// the module (vi.resetModules + dynamic import) to get a fresh stack.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const isNative = vi.fn(() => true)
  const appAddListener = vi.fn(
    async (_event: string, _listener: (e: { canGoBack: boolean }) => void) => ({
      remove: () => Promise.resolve(),
    }),
  )
  const exitApp = vi.fn(async () => {})
  return { isNative, appAddListener, exitApp }
})

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => mocks.isNative() },
}))

vi.mock('@capacitor/app', () => ({
  App: { addListener: mocks.appAddListener, exitApp: mocks.exitApp },
}))

type BackHandlerModule = typeof import('../../app/utils/back-handler')
let backHandler: BackHandlerModule

beforeEach(async () => {
  vi.clearAllMocks()
  // Native by default; browser scenarios override per-test.
  mocks.isNative.mockReturnValue(true)
  vi.resetModules()
  backHandler = await import('../../app/utils/back-handler')
})

describe('registerBackHandler / handleBackButton', () => {
  it('returns false with no handlers registered', () => {
    expect(backHandler.handleBackButton()).toBe(false)
  })

  it('returns true and runs the handler when one is registered', () => {
    const handled = vi.fn(() => true)
    backHandler.registerBackHandler(handled)

    expect(backHandler.handleBackButton()).toBe(true)
    expect(handled).toHaveBeenCalledTimes(1)
  })

  it('unregistering removes the handler', () => {
    const handled = vi.fn(() => true)
    const remove = backHandler.registerBackHandler(handled)
    remove()

    expect(backHandler.handleBackButton()).toBe(false)
    expect(handled).not.toHaveBeenCalled()
  })

  it('consults the most recently registered handler first (LIFO)', () => {
    const first = vi.fn(() => false) // does not consume
    const second = vi.fn(() => true) // consumes
    backHandler.registerBackHandler(first)
    backHandler.registerBackHandler(second)

    expect(backHandler.handleBackButton()).toBe(true)
    expect(second).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()

    // After the top handler is removed, the one below gets the press.
    second.mockReturnValue(false)
    expect(backHandler.handleBackButton()).toBe(false)
    expect(first).toHaveBeenCalledTimes(1)
  })

  it('stops at the first handler that consumes the press', () => {
    const consume = vi.fn(() => true)
    const below = vi.fn(() => true)
    backHandler.registerBackHandler(below)
    backHandler.registerBackHandler(consume)

    expect(backHandler.handleBackButton()).toBe(true)
    expect(consume).toHaveBeenCalledTimes(1)
    expect(below).not.toHaveBeenCalled()
  })
})

describe('addBackButtonListener', () => {
  it('registers the native listener and forwards canGoBack', async () => {
    const onBack = vi.fn()
    backHandler.addBackButtonListener(onBack)

    const [event, listener] = mocks.appAddListener.mock.calls[0]!
    expect(event).toBe('backButton')
    listener({ canGoBack: true })
    expect(onBack).toHaveBeenCalledWith(true)
  })

  it('is a no-op subscription in the browser', () => {
    mocks.isNative.mockReturnValue(false)
    const sub = backHandler.addBackButtonListener(vi.fn())

    expect(mocks.appAddListener).not.toHaveBeenCalled()
    expect(sub.remove).toBeTypeOf('function')
  })

  it('removes the eventual handle even when remove() wins the race', async () => {
    // Make the appStateChange listener register deferred, so remove() can
    // run before the plugin promise resolves (the leak scenario).
    let resolveAdd!: (h: { remove: () => Promise<void> }) => void
    mocks.appAddListener.mockImplementationOnce(
      () => new Promise((res) => { resolveAdd = res }),
    )
    const handleRemove = vi.fn(() => Promise.resolve())
    const deferredHandle = { remove: handleRemove }

    const sub = backHandler.addBackButtonListener(vi.fn())
    sub.remove()
    resolveAdd(deferredHandle)
    await Promise.resolve()
    await Promise.resolve()

    expect(handleRemove).toHaveBeenCalledTimes(1)
  })
})

describe('exitApp', () => {
  it('calls App.exitApp on native', async () => {
    await backHandler.exitApp()
    expect(mocks.exitApp).toHaveBeenCalledTimes(1)
  })

  it('is a no-op in the browser', async () => {
    mocks.isNative.mockReturnValue(false)
    await backHandler.exitApp()
    expect(mocks.exitApp).not.toHaveBeenCalled()
  })
})
