import * as Sentry from "@sentry/react-native";

/**
 * Initialise Sentry for error monitoring and light tracing.
 *
 * DSN is read from the SENTRY_DSN env var (set in .env.local for dev,
 * or as an EAS secret for production builds). If no DSN is provided
 * Sentry stays inert — safe to ship without configuration.
 */
export const initSentry = (): void => {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    if (__DEV__) {
      console.warn("[Sentry] No EXPO_PUBLIC_SENTRY_DSN set — error reporting disabled.");
    }
    // Still call init with no DSN so Sentry.wrap() doesn't complain.
    Sentry.init({});
    return;
  }

  Sentry.init({
    dsn,
    // Capture 20 % of transactions in production, all in development.
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    // Enable Sentry Logs so we can use Sentry.logger for structured logging.
    enableLogs: true,
    // Attach basic device / app context to every event.
    sendDefaultPii: false,
    // Attach useful tags for filtering in the Sentry dashboard.
    environment: __DEV__ ? "development" : "production",
  });
};
