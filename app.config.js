// Per-environment package id + display name:
// - Local `expo run:android` (no EAS_BUILD_PROFILE) and EAS "development"
//   -> com.emachado.soiquit.dev / "So I Quit (dev)"
// - EAS "preview" -> com.emachado.soiquit.preview / "So I Quit (preview)"
// - EAS "production" -> com.emachado.soiquit / "So I Quit"
const SUFFIXES = {
  preview: { pkg: ".preview", name: " (preview)" },
  development: { pkg: ".dev", name: " (dev)" },
  production: { pkg: "", name: "" },
};

const profile = process.env.EAS_BUILD_PROFILE ?? "development";
const { pkg, name } = SUFFIXES[profile] ?? SUFFIXES.development;

export default ({ config }) => ({
  ...config,
  name: `${config.name}${name}`,
  android: {
    ...config.android,
    package: `${config.android.package}${pkg}`,
  },
});
