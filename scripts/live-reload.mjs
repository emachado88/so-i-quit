#!/usr/bin/env node
/**
 * Live reload dev loop — Android no telemóvel com HMR do Vite.
 *
 * Resolve o IP LAN da máquina, verifica que o dev server do Nuxt está a
 * responder, e corre `npx cap run android` com CAP_LIVE_URL injetado
 * (o capacitor.config.ts lê essa env var e aponta o WebView para o server).
 *
 * Uso:
 *   npm run mobile:run:live                  # telemóvel físico (mesma Wi-Fi)
 *   npm run mobile:run:live -- --emulator    # emulador (usa 10.0.2.2)
 *   npm run mobile:run:live -- --ip 192.168.1.42   # override explícito
 *
 * Requisito: dev server a correr primeiro → npm run mobile:dev
 */
import { spawn, spawnSync } from 'node:child_process'
import readline from 'node:readline/promises'

const PORT = process.env.PORT || '3000'
const args = process.argv.slice(2)
const IS_EMULATOR = args.includes('--emulator')
const ipOverride = args.includes('--ip') ? args[args.indexOf('--ip') + 1] : null
const EXTRA_ARGS = args.filter((a) => a !== '--emulator' && a !== '--ip' && a !== ipOverride)

/** Nomes típicos de interfaces virtuais que o telemóvel nunca alcança. */
const VIRTUAL = /^(lo|docker|veth|br-|virbr|tun|tap|wg|wireguard|tailscale|utun|ppp|zt|vpn|nord|mullvad|proton)/

/** Lista de {iface, ip} IPv4 globais de interfaces físicas/LAN. */
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
    throw new Error('Não encontrei nenhuma interface LAN — verifica a ligação de rede.')
  }
  // stdin não-interativo (pipes/CI): sem como perguntar — usa a primeira.
  if (!process.stdin.isTTY) {
    console.log(`ℹ  Múltiplas interfaces (${candidates.map((c) => `${c.ip} ${c.iface}`).join(', ')}) — a usar a primeira`)
    return candidates[0]
  }
  // Várias interfaces reais (ex.: Ethernet + Wi-Fi): perguntar qual usar.
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  console.log('Várias interfaces LAN encontradas — qual deve o telemóvel usar?')
  candidates.forEach((c, i) => console.log(`  ${i + 1}) ${c.ip}  (${c.iface})`))
  let pick = 1
  const answer = (await rl.question(`Escolhe [1-${candidates.length}, default 1]: `)).trim()
  rl.close()
  const n = parseInt(answer, 10)
  if (Number.isInteger(n) && n >= 1 && n <= candidates.length) pick = n
  return candidates[pick - 1]
}

const chosen = IS_EMULATOR ? { ip: '10.0.2.2', iface: 'emulator' } : await lanIPv4()
const url = `http://${chosen.ip}:${PORT}`
console.log(`🔗 Live reload: ${url}${chosen.iface ? `  (${chosen.iface})` : ''}`)

// Dev server pronto? Erro claro em vez de app apontada para um server morto.
try {
  const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
} catch {
  console.error(`\n⚠  Dev server não está a responder em ${url}`)
  console.error('   Arranca primeiro:  npm run mobile:dev  (depois re-corre este script)')
  process.exit(1)
}

const child = spawn('npx', ['cap', 'run', 'android', ...EXTRA_ARGS], {
  stdio: 'inherit',
  env: { ...process.env, CAP_LIVE_URL: url },
})
child.on('exit', (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0))
})
