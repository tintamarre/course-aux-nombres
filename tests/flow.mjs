// End-to-end flow test: plays the game automatically in headless Chrome and reports stalls and errors.
// usage: npm run dev (in another terminal), then: npm run test:flow [-- seconds] [-- url-query]
// Speech runs for real but silently (?mute, dev only), sounds are off.
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const [seconds = '90', query = ''] = process.argv.slice(2)
const base = process.env.FLOW_URL ?? 'http://localhost:5173/course-aux-nombres/'
const chromePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const autoplay = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'autoplay.js'), 'utf8')
const port = 9300 + Math.floor(Math.random() * 600)
const chrome = spawn(chromePath, ['--headless=new', `--remote-debugging-port=${port}`, '--window-size=1180,820', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'flow-'))}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let ws
for (let i = 0; i < 50 && !ws; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
    ws = new WebSocket(list.find((p) => p.type === 'page').webSocketDebuggerUrl)
  } catch {
    await sleep(200)
  }
}
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (m) => {
  const d = JSON.parse(m.data)
  if (d.id && pending.has(d.id)) pending.get(d.id)(d), pending.delete(d.id)
}
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true })).result?.result?.value

await send('Page.navigate', { url: base })
await sleep(1500)
await evaluate(`localStorage.clear();
  localStorage.setItem('can-settings', JSON.stringify({ voice: true, voiceRate: 1, voiceURI: '', sounds: false, autoMove: false, sessionMinutes: 0 }));
  localStorage.setItem('can-profile-flow', JSON.stringify({ id: 'flow', name: 'Test', prior: 'modere', createdAt: Date.now(), K: [], history: [], trials: [], sessions: [], fish: 0, character: 'dauphin', owned: ['dauphin'], race: { player: 0, crab: 0 } }));
  localStorage.setItem('can-profiles', JSON.stringify({ ids: ['flow'], current: 'flow' })); 1`)
await send('Page.navigate', { url: `${base}?mute${query ? '&' + query : ''}` })
await sleep(2500)
// a real user gesture: unlocks Web Audio, so the recorded voice is used as on a device
await evaluate(`document.querySelector('.sea').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Jouer').click(); 1`)
await sleep(800)
const result = JSON.parse(await evaluate(`window.__DUR = ${Number(seconds) * 1000}; ${autoplay}`))
console.log(JSON.stringify(result, null, 2))
ws.close()
chrome.kill()
process.exit(result.stalls.length || result.errors.length ? 1 : 0)
