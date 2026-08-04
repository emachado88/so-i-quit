/**
 * Jest global setup (setupFilesAfterEnv) — mocks for RN/Expo modules.
 *
 * What this file provides:
 *  - in-memory AsyncStorage (shared Map, cleared before each test);
 *  - controllable expo-localization / expo-constants fixtures;
 *  - expo-router hooks/components stubs (useFocusEffect runs the effect,
 *    useIsFocused is always true, router/navigation are jest.fn()s);
 *  - react-native-reanimated manual stub (kept manual for determinism);
 *  - react-native-svg, expo-haptics, expo-font, google-fonts, sentry and
 *    datetimepicker stubs.
 *
 * NOTE: `expo-notifications` is intentionally NOT mocked here — the app code
 * lazy-requires it behind an Expo Go guard (expo-constants mock defaults to
 * executionEnvironment "StoreClient"), so it stays inert unless a test file
 * opts in with its own jest.mock.
 *
 * Shared mutable state is stashed on globalThis (jest.mock factories are
 * hoisted above module scope, so out-of-scope variable references are
 * forbidden; globalThis sidesteps that entirely).
 */
import "@testing-library/react-native";
// The `jest` object is not a typed global in @types/jest — import it from
// @jest/globals (same runtime object; babel-plugin-jest-hoist allows it in
// mock factories).
import { jest } from "@jest/globals";

// ---------------------------------------------------------------------------
// AsyncStorage — pure in-memory store
// ---------------------------------------------------------------------------

jest.mock("@react-native-async-storage/async-storage", () => {
  const store = new Map<string, string>();
  (globalThis as unknown as { __rnTestStorage: Map<string, string> }).__rnTestStorage =
    store;
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => store.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: jest.fn(async (key: string) => {
        store.delete(key);
      }),
      multiGet: jest.fn(async (keys: string[]) =>
        keys.map((k) => [k, store.get(k) ?? null] as [string, string | null]),
      ),
      multiSet: jest.fn(async (pairs: [string, string][]) => {
        for (const [k, v] of pairs) store.set(k, v);
      }),
    },
  };
});

// ---------------------------------------------------------------------------
// expo-localization — locale fixture, overridable per test via __rnTestLocales
// ---------------------------------------------------------------------------

const mockLocales = [
  {
    languageTag: "en-US",
    languageCode: "en",
    regionCode: "US",
    currencyCode: "USD",
  },
];
// Independent copy: the per-test fixture array is mutated in place, so the
// reset must restore from a source that is never itself emptied.
const defaultLocales = [...mockLocales];
(globalThis as unknown as { __rnTestLocales: typeof mockLocales }).__rnTestLocales =
  mockLocales;

jest.mock("expo-localization", () => ({
  getLocales: () =>
    (globalThis as unknown as { __rnTestLocales: typeof mockLocales }).__rnTestLocales,
}));

// ---------------------------------------------------------------------------
// expo-constants — default to Expo Go (StoreClient); native-path tests
// override the executionEnvironment via globalThis.
// ---------------------------------------------------------------------------

const mockConstantsState = { executionEnvironment: "StoreClient" };
(globalThis as unknown as { __rnTestConstants: typeof mockConstantsState }).__rnTestConstants =
  mockConstantsState;

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    get executionEnvironment() {
      return (
        globalThis as unknown as { __rnTestConstants: typeof mockConstantsState }
      ).__rnTestConstants.executionEnvironment;
    },
  },
  ExecutionEnvironment: {
    StoreClient: "StoreClient",
    Bare: "Bare",
    Standalone: "Standalone",
  },
}));

// ---------------------------------------------------------------------------
// expo-router — hooks and components used across screens
// ---------------------------------------------------------------------------

jest.mock("expo-router", () => {
  const React = require("react");
  const { Text, View } = require("react-native");

  const routerState = {
    replace: jest.fn(),
    navigate: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
    setOptions: jest.fn(),
  };
  (globalThis as unknown as { __rnTestRouter: typeof routerState }).__rnTestRouter =
    routerState;

  return {
    useFocusEffect: (callback: () => void | (() => void)) => {
      React.useEffect(() => {
        const cleanup = callback();
        return typeof cleanup === "function" ? cleanup : undefined;
      }, [callback]);
    },
    useRouter: () => routerState,
    useNavigation: () => ({ setOptions: routerState.setOptions }),
    useIsFocused: () => true,
    useLocalSearchParams: () => ({}),
    Link: ({ children, ...props }: any) =>
      // Text wrapper: the test renderer rejects raw strings inside a View.
      React.createElement(Text, props, children),
    Stack: Object.assign(
      ({ children }: any) => React.createElement(View, null, children),
      { Screen: () => null },
    ),
    Tabs: Object.assign(
      ({ children }: any) => React.createElement(View, null, children),
      {
        // Invoke the tabBarIcon renderer so icon lines are exercised.
        Screen: ({ options }: any) =>
          options?.tabBarIcon
            ? options.tabBarIcon({ color: "#000", focused: false, size: 28 })
            : null,
      },
    ),
  };
});

// Subpath used by components/haptic-tab.tsx.
jest.mock("expo-router/build/react-navigation", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    PlatformPressable: (props: any) => React.createElement(View, props),
  };
});

// ---------------------------------------------------------------------------
// react-native-reanimated — manual stub (official mock.js is brittle)
// ---------------------------------------------------------------------------

jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  const { useRef } = require("react");
  const identity = <T,>(v: T): T => v;
  return {
    // __esModule is required so `import Animated from "react-native-reanimated"`
    // resolves to the `default` object (Animated.View / createAnimatedComponent).
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (Component: any) => Component,
    },
    // Real useSharedValue returns a STABLE object across renders (mutations
    // like `animating.value = true` must survive re-renders).
    useSharedValue: (initial: number) => {
      const ref = useRef(null);
      if (ref.current === null) ref.current = { value: initial };
      return ref.current as { value: number };
    },
    useAnimatedStyle: (factory: () => object) => factory() ?? {},
    useAnimatedProps: (factory: () => object) => factory() ?? {},
    // Real withTiming invokes the completion callback after the tween — the
    // stub fires it on a macrotask so in-flight-animating state is preserved
    // until tests advance fake timers.
    withTiming: (toValue: number, _config?: object, callback?: () => void) => {
      if (callback) setTimeout(callback, 0);
      return toValue;
    },
    withSpring: identity,
    withSequence: (...values: number[]) => values[values.length - 1],
    cancelAnimation: () => {},
    Easing: {
      out: (easing: any) => easing,
      cubic: (t: number) => t,
      linear: (t: number) => t,
    },
  };
});

// ---------------------------------------------------------------------------
// react-native-svg — host-component stubs (native module unavailable)
// ---------------------------------------------------------------------------

jest.mock("react-native-svg", () => {
  const React = require("react");
  const { View } = require("react-native");
  const stub = (props: any) => React.createElement(View, props);
  return {
    // __esModule so the default import resolves to the stub function.
    __esModule: true,
    default: stub,
    Svg: stub,
    Circle: stub,
  };
});

// ---------------------------------------------------------------------------
// expo-haptics / expo-font / google fonts / sentry / datetimepicker
// ---------------------------------------------------------------------------

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
}));

// Paper Modal/Dialog/Provider render SafeAreaProviderCompat, which uses
// react-native-safe-area-context — the native module is unavailable under
// jest and this package's jest/mock is shipped as un-compiled .tsx, so mock
// the module manually. Consumer invokes its render prop with null insets so
// SafeAreaProviderCompat falls through to the SafeAreaProvider passthrough.
jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  const invokeWithNull = ({ children }: any) => children(null);
  return {
    __esModule: true,
    SafeAreaProvider: ({ children, ...props }: any) =>
      React.createElement(View, props, children),
    SafeAreaInsetsContext: {
      Provider: ({ children }: any) => children,
      Consumer: invokeWithNull,
    },
    SafeAreaFrameContext: {
      Provider: ({ children }: any) => children,
      Consumer: invokeWithNull,
    },
    SafeAreaConsumer: ({ children }: any) => children(null),
    useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 0, height: 0 }),
    initialWindowMetrics: null,
  };
});

jest.mock("expo-font", () => ({
  useFonts: () => [true],
  // @expo/vector-icons (Paper icons) calls Font.isLoaded at module setup.
  isLoaded: () => true,
}));

jest.mock("@expo-google-fonts/inter", () => ({
  Inter_400Regular: null,
  Inter_500Medium: null,
  Inter_600SemiBold: null,
  Inter_700Bold: null,
  Inter_900Black: null,
}));

jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  wrap: (component: any) => component,
  addBreadcrumb: jest.fn(),
}));

jest.mock("@react-native-community/datetimepicker", () => ({
  default: () => null,
  DateTimePickerAndroid: { open: jest.fn() },
}));

// ---------------------------------------------------------------------------
// Console noise filtering — expected, deliberate error-path logging
// ---------------------------------------------------------------------------

const KNOWN_CONSOLE_NOISE: RegExp[] = [
  /^Error loading habits:/,
  /^Error completing wizard:/,
  /^Error scheduling milestone notifications:/,
  /^Error updating date:/,
  /^Error updating savings:/,
  /^Error cancelling milestone notifications:/,
  /^Error deleting habit:/,
  /^Error adding habit:/,
  /^Error adding custom habit:/,
  /^\[Sentry\] No EXPO_PUBLIC_SENTRY_DSN set/,
];

const realConsoleError = console.error.bind(console);
const realConsoleWarn = console.warn.bind(console);

// App code logs via console.error/warn inside catch handlers (the screen also
// shows a Snackbar); tests that force those error paths produce EXPECTED
// noise. Swallow only the known prefixes — anything else (act warnings,
// unexpected errors, debug output) still reaches jest's console so genuine
// problems stay visible.
const isKnownConsoleNoise = (args: unknown[]) =>
  typeof args[0] === "string" &&
  KNOWN_CONSOLE_NOISE.some((pattern) => pattern.test(args[0] as string));

console.error = (...args: unknown[]) => {
  if (!isKnownConsoleNoise(args)) realConsoleError(...args);
};
console.warn = (...args: unknown[]) => {
  if (!isKnownConsoleNoise(args)) realConsoleWarn(...args);
};

// ---------------------------------------------------------------------------
// Reset shared state before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  (globalThis as unknown as { __rnTestStorage?: Map<string, string> }).__rnTestStorage?.clear();
  const router = (globalThis as unknown as { __rnTestRouter?: Record<string, jest.Mock> }).__rnTestRouter;
  if (router) {
    for (const fn of Object.values(router)) fn.mockClear();
  }
  // Reset environment fixtures to their defaults.
  (globalThis as unknown as { __rnTestConstants?: { executionEnvironment: string } }).__rnTestConstants!.executionEnvironment =
    "StoreClient";
  (globalThis as unknown as { __rnTestLocales?: unknown[] }).__rnTestLocales!.length = 0;
  (globalThis as unknown as { __rnTestLocales?: unknown[] }).__rnTestLocales!.push(...defaultLocales);
});
