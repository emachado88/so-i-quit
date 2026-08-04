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
  const { View } = require("react-native");

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
      React.createElement(View, props, children),
    Stack: Object.assign(
      ({ children }: any) => React.createElement(View, null, children),
      { Screen: () => null },
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
  const identity = <T,>(v: T): T => v;
  return {
    default: {
      View,
      createAnimatedComponent: (Component: any) => Component,
    },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (factory: () => object) => factory() ?? {},
    useAnimatedProps: (factory: () => object) => factory() ?? {},
    withTiming: identity,
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
  return { default: stub, Svg: stub, Circle: stub };
});

// ---------------------------------------------------------------------------
// expo-haptics / expo-font / google fonts / sentry / datetimepicker
// ---------------------------------------------------------------------------

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
}));

jest.mock("expo-font", () => ({
  useFonts: () => [true],
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
