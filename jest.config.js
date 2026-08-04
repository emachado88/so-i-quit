/** Jest configuration — the standard Expo/RN test runner (jest-expo preset). */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["./test/setup-jest.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  collectCoverageFrom: [
    "app/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "constants/**/*.{ts,tsx}",
    "contexts/**/*.{ts,tsx}",
    "data/**/*.{ts,tsx}",
    "hooks/**/*.{ts,tsx}",
    "i18n/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "utils/**/*.{ts,tsx}",
    "!**/__tests__/**",
    "!**/*.test.{ts,tsx}",
  ],
  // Project standard: enforced by `npm run test:coverage`.
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
};
