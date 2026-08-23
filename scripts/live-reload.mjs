#!/usr/bin/env node
/**
 * Live reload dev loop — Android on the phone with Vite HMR.
 *
 * Resolves the machine's LAN IP, checks that the Nuxt dev server is
 * responding, and runs `npx cap run android` with CAP_LIVE_URL injected
 * (capacitor.config.ts reads that env var and points the WebView at the server).
 *
 * Usage:
 *   npm run mobile:live                  # physical phone (same Wi-Fi)
 *   npm run mobile:live -- --emulator    # emulator (uses 10.0.2.2)
 *   npm run mobile:live -- --ip 192.168.1.42   # explicit override
 *
 * Requirement: start the dev server first → npm run dev
 */
import { spawn, spawnSync } from 'node:child_process'
import readline from 'node:readline/promises'

const PORT = process.env.PORT || '3000'
const args = process.argv.slice(2)
const IS_EMULATOR = args.includes('--emulator')
const ipOverride = args.includes('--ip') ? args[args.indexOf('--ip') + 1] : null
const EXTRA_ARGS = args.filter(a => a !== '--emulator' && a !== '--ip' && a !== ipOverride)

/** Typical names of virtual interfaces the phone can never reach. */
const VIRTUAL = /^(lo|docker|veth|br-|virbr|tun|tap|wg|wireguard|tailscale|utun|ppp|zt|vpn|nord|mullvad|proton)/

/** List of {iface, ip} global IPv4 addresses of physical/LAN interfaces. */
function candidateIPs() {
  const out = spawnSync('ip', ['-4', '-o', 'addr', 'show']).stdout?.toString() ?? ''
  const addrs = []
  for (const line of out.split('\n')) {
    const m = line.match(/^\d+:\s+(\S+)\s+inet\s+(\d+\.\d+\.\d+\.\d+)\//)
    if (!m) continue
    const [, iface, ip] = m
    if (ip.startsWith('127.') || VIRTUAL.test(iface)) continue
    addrs.push({ iface, ip })
  }
  return addrs
}

async function lanIPv4() {
  if (ipOverride) return { ip: ipOverride, iface: 'override' }
  const candidates = candidateIPs()
  if (candidates.length === 1) return candidates[0]
  if (candidates.length === 0) {
    throw new Error('Could not find any LAN interface — check your network connection.')
  }
  // Non-interactive stdin (pipes/CI): nothing to ask — use the first one.
  if (!process.stdin.isTTY) {
    console.log(`ℹ  Multiple interfaces (${candidates.map(c => `${c.ip} ${c.iface}`).join(', ')}) — using the first`)
    return candidates[0]
  }
  // Multiple real interfaces (e.g. Ethernet + Wi-Fi): ask which to use.
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  console.log('Multiple LAN interfaces found — which one should the phone use?')
  candidates.forEach((c, i) => console.log(`  ${i + 1}) ${c.ip}  (${c.iface})`))
  let pick = 1
  const answer = (await rl.question(`Choose [1-${candidates.length}, default 1]: `)).trim()
  rl.close()
  const n = parseInt(answer, 10)
  if (Number.isInteger(n) && n >= 1 && n <= candidates.length) pick = n
  return candidates[pick - 1]
}

const chosen = IS_EMULATOR ? { ip: '10.0.2.2', iface: 'emulator' } : await lanIPv4()
const url = `http://${chosen.ip}:${PORT}`
console.log(`🔗 Live reload: ${url}${chosen.iface ? `  (${chosen.iface})` : ''}`)

// Dev server ready? Clear error instead of an app pointed at a dead server.
try {
  const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}
catch {
  console.error(`\n⚠  Dev server is not responding at ${url}`)
  console.error('   Start it first:  npm run dev  (then re-run this script)')
  process.exit(1)
}

const child = spawn('npx', ['cap', 'run', 'android', ...EXTRA_ARGS], {
  stdio: 'inherit',
  env: { ...process.env, CAP_LIVE_URL: url },
})
child.on('exit', (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0))
})
