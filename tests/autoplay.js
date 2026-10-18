(async () => {
  const DURATION = window.__DUR || 90000
  const errors = []
  window.addEventListener('error', (e) => errors.push(String(e.message)))
  window.addEventListener('unhandledrejection', (e) => errors.push('rejection: ' + String(e.reason)))
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const down = (el) => el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }))
  const t0 = performance.now()
  let lastSig = '', lastChange = performance.now(), stalls = [], actions = { choose: 0, coin: 0, square: 0, cont: 0 }
  const sig = () => document.querySelector('#app').innerText.replace(/\s+/g, ' ').slice(0, 400) + '|' + [...document.querySelectorAll('.token')].map((t) => t.style.transform).join()
  while (performance.now() - t0 < DURATION) {
    const btn = [...document.querySelectorAll('button')].find((b) => ['Continuer', 'On recommence !'].includes(b.textContent.trim()))
    const chosen = document.querySelector('.treasure-chosen')
    const treasures = [...document.querySelectorAll('.treasure')]
    const start = document.querySelector('[aria-label="Commencer"], [aria-label="Manche suivante"]')
    if (btn) { await sleep(300 + Math.random() * 1500); btn.click(); actions.cont++ }
    else if (start) { await sleep(200 + Math.random() * 1500); down(start); actions.start = (actions.start || 0) + 1 }
    else if (treasures.length && !chosen && treasures.every((t) => t.classList.contains('treasure-live'))) {
      await sleep(Math.random() < 0.5 ? 150 : 1200)
      down(treasures[Math.floor(Math.random() * 2)]); actions.choose++
    } else if (chosen && document.querySelector('svg.track [data-next]')) {
      const next = document.querySelector('svg.track [data-next]')
      if (Math.random() < 0.15 || !next) {
        // a random square: usually a wrong one (it shakes), sometimes the arrival square shortcut
        const sq = [...document.querySelectorAll('svg.track .track-scroll > g')]; if (sq.length) { down(sq[Math.floor(Math.random() * sq.length)]); actions.square++ }
      } else { down(next); actions.coin++ }
      await sleep(Math.random() < 0.5 ? 60 : 500)
    }
    if (document.body.innerText.includes("C'est fini pour aujourd'hui")) break
    const s = sig()
    if (s !== lastSig) { lastSig = s; lastChange = performance.now() }
    else if (performance.now() - lastChange > 25000) { stalls.push(s.slice(0, 200)); lastChange = performance.now() }
    await sleep(100)
  }
  const p = JSON.parse(localStorage.getItem('can-profiles')); const pr = JSON.parse(localStorage.getItem('can-profile-' + p.current) || '{}')
  const clipsLoaded = performance.getEntriesByType('resource').filter((e) => e.name.includes('/audio/')).length
  return JSON.stringify({ clipsLoaded, seconds: Math.round((performance.now() - t0) / 1000), trials: pr.trials?.length, fish: pr.fish, race: pr.race, actions, stalls, errors })
})()
