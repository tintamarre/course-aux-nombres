<script lang="ts">
/** module scope: the "how to move" and "ready?" prompts are spoken once per visit, not at every turn */
let hintGiven = false
let readyPromptGiven = false
</script>

<script setup lang="ts">
/**
 * One turn of the race on a single screen: the track stays visible above the two treasures.
 *
 * 0. ready (first round, or after a race): a big start button; the treasures (and the crab's
 *    deadline) only appear when the child touches it, so a round never starts while the child
 *    is looking away.
 * 1. choose: the child touches the larger treasure (before the crab reaches the key when there is
 *    a deadline). What is shown before the choice depends on the complexity level (Table 1).
 * 2. reveal: both treasures in the three formats (pieces, digit, spoken word).
 * 3. move: the child touches the squares one by one, each touch puts a piece there (counted
 *    aloud), or touches the arrival square directly.
 * 4. crab: the crab does the same with the other treasure.
 * 5. pause: everything stays on screen (track, operations, treasures) with a start button over
 *    it: a moment to look at the results before the next round, which starts on touch.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Problem, Quantity, Side } from '../engine/problem'
import { BOX, layoutDots } from '../engine/dots'
import { hazardKind, move, positionComment } from '../engine/board'
import { numberWord, operationWords } from '../data/words'
import { phrases } from '../data/phrases'
import { countAloud, hush, say, sayNow } from '../composables/useSpeech'
import { sounds } from '../composables/useSounds'
import { useSettings } from '../composables/useSettings'
import TrackView, { type Lane } from './TrackView.vue'
import CrabSprite from './CrabSprite.vue'
import CoinIcon from './CoinIcon.vue'
import CoinRows from './CoinRows.vue'

const props = defineProps<{
  problem: Problem
  character: string
  player: number
  crab: number
  /** traps (anemones, urchins, jellyfish), shared by both characters */
  hazards: number[]
  /** number of squares of this race */
  length: number
  /** start with the big start button (first round of the session, or after a race) */
  startReady?: boolean
}>()
const emit = defineEmits<{
  choice: [choice: Side | null, rt: number]
  done: [player: number, crab: number, winner: Lane | null]
}>()

const settings = useSettings()
type Phase = 'ready' | 'choose' | 'reveal' | 'move' | 'crab' | 'end' | 'pause'
const phase = ref<Phase>(settings.readyButton && props.startReady ? 'ready' : 'choose')
const speaking = ref<Side | null>(null)
const crabRunning = ref(false)
const crabEl = ref<HTMLElement | null>(null)
const crabTop = ref('100%')
const choice = ref<Side | null>(null)
const timedOut = ref(false)
const opStep = ref(0)
const message = ref('')
/** each move shown as an operation on the numbered track: 7 + 4 = 11, 11 − 2 = 9 */
interface Operation {
  a: number
  sign: '+' | '−'
  b: number
  result: number | null
}
/** per character: the move forward and, after an anemone, the move back (shown as two operations) */
const operations = ref<Record<Lane, Operation[]>>({ player: [], crab: [] })
function setOperation(lane: Lane, op: Operation) {
  const list = operations.value[lane]
  const i = list.findIndex((x) => x.sign === op.sign)
  if (i >= 0) list[i] = op
  else list.push(op)
}

const playerPos = ref(props.player)
const crabPos = ref(props.crab)
const placed = ref<Record<Lane, number[]>>({ player: [], crab: [] })
const placedCount = ref({ player: 0, crab: 0 })
const shake = ref<number | null>(null)
const hit = ref<{ lane: Lane; square: number } | null>(null)
const busy = ref(false)

const lvl = computed(() => props.problem.level)
const sides: Side[] = ['left', 'right']
const q = (s: Side): Quantity => props.problem[s]
const other = (s: Side): Side => (s === 'left' ? 'right' : 'left')
const dots = {
  left: layoutDots(props.problem.left.operation ? 0 : props.problem.left.value, props.problem.dotControl, Math.random),
  right: layoutDots(props.problem.right.operation ? 0 : props.problem.right.value, props.problem.dotControl, Math.random),
}
const correct = computed(() => choice.value === props.problem.larger && !timedOut.value)
/** side whose pieces belong to each character once the choice is made */
const sideOf = (lane: Lane): Side => (lane === 'player' ? choice.value! : other(choice.value!))
const piecesFor = (lane: Lane) => {
  const from = lane === 'player' ? props.player : props.crab
  return Math.min(props.length, from + q(sideOf(lane)).value) - from
}
const piecesLeft = (lane: Lane) => piecesFor(lane) - placedCount.value[lane]
const playerTarget = computed(() => props.player + piecesFor('player'))

let hintTimer: ReturnType<typeof setTimeout> | undefined
let shownAt = 0
let alive = true
let deadlineTimer: ReturnType<typeof setTimeout> | undefined
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
/** two animation frames: lets the browser lay out the start position before a CSS transition */
const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))

const spokenText = (s: Side) => {
  const op = q(s).operation
  return op ? operationWords(op.a, op.op, op.b) : numberWord(q(s).value)
}

onMounted(() => {
  if (phase.value === 'choose') void startRound()
  else if (!readyPromptGiven) {
    readyPromptGiven = true
    void say(phrases.readyPrompt)
  }
})

/** The child is ready: show the treasures, say them if the level is spoken, start the deadline. */
async function startRound() {
  if (phase.value === 'ready') {
    hush()
    phase.value = 'choose'
  }
  await nextFrame()
  shownAt = performance.now()
  if (lvl.value.spoken) {
    for (const s of sides) {
      if (!alive || phase.value !== 'choose') return
      speaking.value = s
      await say(spokenText(s))
      speaking.value = null
    }
  }
  if (!alive || phase.value !== 'choose') return
  if (props.problem.deadline !== null) {
    await nextFrame()
    if (!alive || phase.value !== 'choose') return
    crabRunning.value = true
    crabTop.value = '0%'
    deadlineTimer = setTimeout(() => choose(null), props.problem.deadline * 1000)
  }
}

onBeforeUnmount(() => {
  alive = false
  clearTimeout(deadlineTimer)
  clearTimeout(hintTimer)
})

/* ---------- 1–2. choice and feedback ---------- */
async function choose(s: Side | null) {
  if (phase.value !== 'choose') return
  clearTimeout(deadlineTimer)
  if (speaking.value) hush()
  const rt = Math.round(performance.now() - shownAt)
  timedOut.value = s === null
  // when time runs out, the crab takes the larger treasure and the child gets the other one
  choice.value = s ?? other(props.problem.larger)
  if (crabEl.value && crabRunning.value) crabTop.value = s === null ? '0%' : getComputedStyle(crabEl.value).top
  crabRunning.value = false
  phase.value = 'reveal'
  emit('choice', s, rt)

  correct.value ? sounds.win() : sounds.lose()
  const revealStart = performance.now()

  // 1. concretise the operation slowly, and say it in full: first operand, then the pieces
  //    that join (+) or leave (−), then the result ("trois plus deux égale cinq")
  const opSide = sides.find((x) => q(x).operation)
  if (opSide) {
    const op = q(opSide).operation!
    await wait(900)
    opStep.value = 1
    await wait(1400)
    opStep.value = 2
    await say(phrases.operation(op.a, op.op, op.b, q(opSide).value))
    if (!alive) return
    await wait(400)
    opStep.value = 3
  }

  // 2. describe the comparison: what the child got, and why it is (or is not) the most
  const big = q(props.problem.larger).value
  const small = q(other(props.problem.larger)).value
  // "plus" is always followed by "grand": speech engines read a final "le plus" as "le plu"
  message.value = `${big}, c'est plus grand que ${small}.`
  const verdict = timedOut.value ? phrases.verdictTimeout() : correct.value ? phrases.verdictWin() : phrases.verdictLose()
  const got = q(choice.value).value
  await say(timedOut.value ? phrases.got(got) : phrases.chose(got))
  if (!alive) return
  await say(phrases.compare(big, small))
  if (!alive) return
  message.value = `${big}, c'est plus grand que ${small}. ${verdict}`
  await say(verdict)

  // 3. leave the feedback on screen a little longer: it matters for learning
  const minFeedback = opSide ? 6000 : 3500
  await wait(Math.max(900, minFeedback - (performance.now() - revealStart)))
  if (!alive) return
  phase.value = 'move'
  setOperation('player', { a: props.player, sign: '+', b: piecesFor('player'), result: null })
  if (settings.autoMove) {
    await placeAll()
  } else armHint()
}

/** Pieces shown in a treasure after the choice; they leave the treasure as they are placed on the track. */
function revealCoins(s: Side) {
  const op = q(s).operation
  const lane: Lane = s === choice.value ? 'player' : 'crab'
  if (op && opStep.value < 3) {
    if (op.op === '+') return { count: op.a, added: opStep.value >= 1 ? op.b : 0, removed: 0 }
    return { count: op.a, added: 0, removed: opStep.value >= 1 ? op.b : 0 }
  }
  return { count: Math.max(0, q(s).value - placedCount.value[lane]), added: 0, removed: 0 }
}

/* ---------- hesitation help: after a few seconds without a touch, the next square glows ---------- */
const hint = ref(false)
function armHint() {
  hint.value = false
  clearTimeout(hintTimer)
  hintTimer = setTimeout(() => {
    if (!alive || phase.value !== 'move' || busy.value) return
    hint.value = true
    if (!hintGiven) {
      hintGiven = true
      void say(phrases.hintMove)
    }
  }, 4000)
}
/** the square the child should touch next */
const nextSquare = computed(() =>
  phase.value === 'move' && !busy.value && piecesLeft('player') > 0 ? props.player + placedCount.value.player + 1 : null,
)

/** squares the track must show: the move being made, or both characters */
const view = computed(() => {
  // the move being made must be visible; the other character too when everything fits
  let from = playerPos.value
  let to = playerPos.value
  if (phase.value === 'crab') [from, to] = [crabPos.value, Math.min(props.length, props.crab + q(sideOf('crab')).value)]
  else if (phase.value === 'move' && choice.value) [from, to] = [Math.min(playerPos.value, props.player), playerTarget.value]
  const other = phase.value === 'crab' ? playerPos.value : crabPos.value
  const lo = Math.min(from, other)
  const hi = Math.max(to, other)
  return hi - lo <= 17 ? [lo, hi] : [from, Math.max(to, from + 9)]
})

/* ---------- 3. counting on along the numbered track ----------
 * Each piece flies from the treasure to the next square, the character steps onto it and the
 * number of that square is said (from 6 with 3 pieces: « sept, huit, neuf »). The move is then read
 * as an operation (« six plus trois, égale neuf »). The paper counted the pieces (1, 2, 3); counting
 * on the square numbers was chosen with the practitioners once the squares were numbered.
 */
let lastFlight: Promise<void> = Promise.resolve()

/** Animate one gold piece from a treasure to a square of the track (one-to-one correspondence made visible). */
function fly(from: Side, square: number): Promise<void> {
  const src = document.querySelector(`[data-side="${from}"] .coin-rows`)?.getBoundingClientRect()
  const dst = document.querySelector(`svg.track [data-sq="${square}"]`)?.getBoundingClientRect()
  if (!src || !dst || matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve()
  const size = Math.max(24, dst.width * 0.7)
  const el = document.createElement('div')
  el.className = 'flying-coin'
  el.style.cssText = `position:fixed;left:0;top:0;width:${size}px;height:${size}px;z-index:40;pointer-events:none;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3c4 0 18%,#f8c73c 19% 62%,#e9a91f 63%)`
  document.body.appendChild(el)
  const x0 = src.left + src.width / 2 - size / 2
  const y0 = src.top + src.height / 2 - size / 2
  const x1 = dst.left + dst.width / 2 - size / 2
  const y1 = dst.top + dst.height * 0.62 - size / 2
  const anim = el.animate(
    [
      { transform: `translate(${x0}px, ${y0}px) scale(1.3)` },
      { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - 40}px) scale(1.1)`, offset: 0.5 },
      { transform: `translate(${x1}px, ${y1}px) scale(1)` },
    ],
    { duration: 380, easing: 'ease-in-out' },
  )
  return anim.finished.then(
    () => el.remove(),
    () => el.remove(),
  )
}

/** One piece leaves the treasure (immediately) and lands on the next square (after its flight). */
/** One piece flies from the treasure onto the next square, then the character steps onto it. */
function placeOne(lane: Lane) {
  placedCount.value[lane]++
  const k = placedCount.value[lane]
  const from = lane === 'player' ? props.player : props.crab
  const pos = lane === 'player' ? playerPos : crabPos
  sounds.coin(k)
  const flight = fly(sideOf(lane), from + k).then(() => {
    if (!alive) return
    placed.value[lane].push(from + k)
    pos.value = from + k
  })
  lastFlight = lastFlight.then(() => flight)
}

function tapTreasure(s: Side) {
  if (phase.value === 'choose') {
    void choose(s)
    return
  }
  // in the move phase the pieces are placed by touching the squares, one by one
  if (phase.value === 'move' && s === choice.value && !busy.value) hint.value = true
}

/** Arrival-square shortcut and automatic mode: the pieces are counted onto the track by the computer. */
async function placeAll() {
  busy.value = true
  placed.value.player = []
  placedCount.value.player = 0
  playerPos.value = props.player
  await countPieces('player')
  if (alive) await moveCharacter('player')
}

/**
 * The child touches the squares one by one: the next square receives a piece (counted aloud).
 * Touching the arrival square directly is the counting-on shortcut of the paper: all the pieces
 * are then counted onto the track. Any other square shakes.
 */
function tapSquare(sq: number) {
  if (phase.value !== 'move' || busy.value || piecesLeft('player') <= 0) return
  if (sq === nextSquare.value) {
    placeOne('player')
    // counting on: the number of the square reached, not the number of pieces
    sayNow(phrases.number(sq))
    armHint()
    if (piecesLeft('player') === 0) {
      busy.value = true
      hint.value = false
      void lastFlight.then(() => {
        if (alive) void moveCharacter('player')
      })
    }
  } else if (sq === playerTarget.value) {
    hint.value = false
    void placeAll()
  } else if (sq > props.player) {
    shake.value = sq
    setTimeout(() => (shake.value = null), 400)
  }
}

/** Count the pieces aloud, one flight per number. */
/** Counting on along the numbered track: the number of each square reached (6 + 3: « sept, huit, neuf »). */
async function countPieces(lane: Lane) {
  const from = lane === 'player' ? props.player : props.crab
  const words = Array.from({ length: piecesFor(lane) }, (_, k) => phrases.number(from + k + 1))
  await countAloud(words, () => placeOne(lane), lane === 'crab' ? 1.3 : 1.15)
  await lastFlight
}

/* ---------- moving ---------- */
async function hop(lane: Lane, to: number) {
  const pos = lane === 'player' ? playerPos : crabPos
  const step = to > pos.value ? 1 : -1
  while (alive && pos.value !== to) {
    pos.value += step
    placed.value[lane] = placed.value[lane].filter((x) => x !== pos.value)
    sounds.hop()
    await wait(140)
  }
}

/** The pieces are on the track and the character on the last one: read the move as an operation. */
async function moveCharacter(lane: Lane) {
  busy.value = true
  const start = lane === 'player' ? props.player : props.crab
  const m = move(start, q(sideOf(lane)).value, props.hazards, props.length)
  const n = m.landing - m.from
  setOperation(lane, { a: m.from, sign: '+', b: n, result: null })
  // the character already walked square by square while counting; finish the walk if needed
  await hop(lane, m.landing)
  setOperation(lane, { a: m.from, sign: '+', b: n, result: m.landing })
  // the move is read as the operation shown under the track: « sept plus quatre, égale onze »
  await say(phrases.operation(m.from, '+', n, m.landing))
  if (m.finished && alive) await say(phrases.arrived)
  await finishMove(lane, m)
}

async function finishMove(lane: Lane, m: ReturnType<typeof move>) {
  placed.value[lane] = []
  if (m.hitHazard && alive) {
    await wait(300)
    setOperation(lane, { a: m.landing, sign: '−', b: m.landing - m.to, result: null })
    hit.value = { lane, square: m.landing }
    sounds.ouch()
    const kind = hazardKind(props.hazards, m.landing)
    message.value = lane === 'player' ? phrases.hazardPlayer(kind) : phrases.hazardCrab(kind)
    await say(message.value)
    await hop(lane, m.to)
    setOperation(lane, { a: m.landing, sign: '−', b: m.landing - m.to, result: m.to })
    hit.value = null
    await say(phrases.operation(m.landing, '-', m.landing - m.to, m.to))
  }
  if (!alive) return
  if (m.finished) {
    phase.value = 'end'
    await wait(200)
    emit('done', playerPos.value, crabPos.value, lane)
    return
  }
  if (lane === 'player') await crabTurn()
  else await endTurn()
}

/* ---------- 4. the crab ---------- */
async function crabTurn() {
  phase.value = 'crab'
  message.value = ''
  busy.value = true
  await wait(300)
  await countPieces('crab')
  if (alive) await moveCharacter('crab')
}

/** The crab's remark is short and heard before the next treasures (the next screen cuts any leftover speech). */
async function endTurn() {
  phase.value = 'end'
  const key = positionComment(props.player, props.crab, playerPos.value, crabPos.value)
  if (key) {
    message.value = phrases.comment(key)
    await say(message.value)
  } else await wait(250)
  if (!alive) return
  // pause: the results stay visible under the start button until the child touches it
  if (settings.readyButton) phase.value = 'pause'
  else emit('done', playerPos.value, crabPos.value, null)
}

function nextRound() {
  if (phase.value !== 'pause') return
  emit('done', playerPos.value, crabPos.value, null)
}
</script>

<template>
  <div class="turn flex h-full flex-col">
    <!-- the race track, always visible -->
    <div class="mx-auto w-full max-w-6xl shrink-0 px-[2vw] pt-[6.5vh]">
      <TrackView
        :character="character"
        :player="playerPos"
        :crab="crabPos"
        :hazards="hazards"
        :length="length"
        :placed="phase === 'crab' ? placed.crab : placed.player"
        :tappable="phase === 'move' && !busy"
        :next="nextSquare"
        :hint="hint"
        :show-from="view[0]"
        :show-to="view[1]"
        :shake="shake"
        :hit="hit?.square ?? null"
        :crab-walking="phase === 'crab' && busy"
        @tap="tapSquare"
      />
    </div>

    <div class="flex min-h-[6vh] shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[clamp(1rem,3vh,1.6rem)] font-bold text-white" aria-live="polite">
      <template v-for="lane in (['player', 'crab'] as const)" :key="lane">
        <span v-for="(op, i) in operations[lane]" :key="i" class="op-chip" :class="lane === 'player' ? 'op-player' : 'op-crab'">
          {{ op.a }} {{ op.sign }} {{ op.b }} =
          <span :class="{ 'opacity-0': op.result === null }">{{ op.result ?? '?' }}</span>
        </span>
      </template>
      <span class="drop-shadow">{{ message }}</span>
    </div>

    <!-- ready? a big start button: the round only starts when the child touches it -->
    <div v-if="phase === 'ready'" class="flex min-h-0 flex-1 items-center justify-center pb-[6vh]">
      <button type="button" class="start-button" aria-label="Commencer" @pointerdown.prevent="startRound">
        <svg viewBox="0 0 24 24" class="h-1/2 w-1/2 translate-x-[6%]"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" /></svg>
      </button>
    </div>

    <!-- the two treasures, with the key and the crab in between when there is a deadline -->
    <div v-else class="relative mx-auto grid min-h-0 w-full max-w-4xl flex-1 grid-cols-[1fr_auto_1fr] grid-rows-[minmax(0,44vh)] content-center gap-[2vw] px-[3vw] pb-[3vh]">
      <!-- pause between rounds: the start button floats over the results, which stay readable -->
      <button
        v-if="phase === 'pause'"
        type="button"
        class="start-button start-overlay"
        aria-label="Manche suivante"
        @pointerdown.prevent="nextRound"
      >
        <svg viewBox="0 0 24 24" class="h-1/2 w-1/2 translate-x-[6%]"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" /></svg>
      </button>
      <div class="relative col-start-2 row-start-1 w-[9vh] min-w-14">
        <template v-if="problem.deadline !== null">
          <svg viewBox="0 0 60 60" class="absolute top-0 left-1/2 w-full -translate-x-1/2" aria-label="clé">
            <circle cx="18" cy="30" r="11" fill="none" stroke="#f8c73c" stroke-width="6" />
            <path d="M29 30 H54 M46 30 V40 M54 30 V42" stroke="#f8c73c" stroke-width="6" stroke-linecap="round" fill="none" />
          </svg>
          <div
            ref="crabEl"
            class="absolute left-1/2 w-full -translate-x-1/2"
            :class="{ 'crab-run': crabRunning }"
            :style="{ top: crabTop, transitionDuration: crabRunning ? `${problem.deadline}s` : '0s', marginTop: crabTop === '100%' ? '-9vh' : '0' }"
          >
            <CrabSprite :walking="crabRunning" />
          </div>
        </template>
      </div>

      <button
        v-for="s in sides"
        :key="s"
        :data-side="s"
        :style="{ gridColumn: s === 'left' ? 1 : 3, gridRow: 1 }"
        type="button"
        class="treasure relative flex min-h-0 flex-col items-center justify-center overflow-hidden rounded-[2rem] p-[2vh]"
        :class="{
          'ring-4 ring-white/80': speaking === s,
          'treasure-chosen': phase !== 'choose' && choice === s,
          'treasure-other': phase !== 'choose' && choice !== s,
          'treasure-live': phase === 'choose' || (phase === 'move' && choice === s && !busy),
        }"
        :aria-label="phase === 'choose' ? `trésor de ${s === 'left' ? 'gauche' : 'droite'}` : 'poser une pièce'"
        @pointerdown.prevent="tapTreasure(s)"
        >
        <template v-if="phase === 'choose'">
          <div v-if="q(s).operation" class="number text-[9vh] leading-none text-[#12263a]">
            {{ q(s).operation!.a }}<span class="mx-[0.15em]">{{ q(s).operation!.op === '+' ? '+' : '−' }}</span>{{ q(s).operation!.b }}
          </div>
          <template v-else>
            <div v-if="lvl.digits" class="number text-[8vh] leading-none text-[#12263a]">{{ q(s).value }}</div>
            <svg
              v-if="lvl.dots"
              :viewBox="`0 0 ${BOX} ${BOX}`"
              class="h-full max-h-[26vh] min-h-0 w-full"
              :class="{ 'fade-out': lvl.fadeSeconds !== null }"
              :style="lvl.fadeSeconds !== null ? { animationDuration: `${lvl.fadeSeconds}s` } : {}"
            >
              <CoinIcon v-for="(d, i) in dots[s]" :key="i" :x="d.x" :y="d.y" :r="d.r" />
            </svg>
          </template>
          <svg v-if="speaking === s" viewBox="0 0 24 24" class="absolute top-3 right-3 h-8 w-8 text-[#12263a]/60">
            <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
            <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" />
          </svg>
        </template>

        <!-- after the choice: digit + pieces (which then leave for the track) -->
        <template v-else>
          <div class="number text-[7vh] leading-none text-[#12263a]">
            <template v-if="q(s).operation">
              {{ q(s).operation!.a }} {{ q(s).operation!.op === '+' ? '+' : '−' }} {{ q(s).operation!.b }}
              <span v-if="opStep >= 2"> = {{ q(s).value }}</span>
            </template>
            <template v-else>{{ q(s).value }}</template>
          </div>
          <CoinRows v-bind="revealCoins(s)" :waiting="phase === 'move' && choice === s && !busy" class="mt-[1.5vh] h-[14vh]" />
          <span class="owner" :class="choice === s ? 'owner-player' : 'owner-crab'">{{ choice === s ? 'à toi' : 'au crabe' }}</span>
          <!-- the larger treasure is marked, so that a wrong choice is visibly corrected -->
          <svg v-if="s === problem.larger && opStep !== 1 && opStep !== 2" viewBox="0 0 24 24" class="larger-star absolute top-[1.5vh] right-[1.5vh] h-[6vh] w-[6vh]" aria-label="le plus grand">
            <path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z" fill="#f8c73c" stroke="#c98a1b" stroke-width="1.2" stroke-linejoin="round" />
          </svg>
        </template>
      </button>
    </div>
  </div>
</template>

<style scoped>
.treasure {
  background: radial-gradient(ellipse at 50% 120%, #f7e3b0 0%, #ecd08f 55%, #dcb974 100%);
  box-shadow: inset 0 -6px 0 rgba(0, 0, 0, 0.08), 0 10px 30px rgba(0, 20, 40, 0.25);
  transition: transform 0.12s ease, opacity 0.2s ease;
}
.treasure-live:active {
  transform: scale(0.97);
}
.treasure-chosen {
  box-shadow: 0 0 0 6px #fff, 0 10px 30px rgba(0, 20, 40, 0.3);
}
.treasure-other {
  opacity: 0.8;
}
.op-chip {
  border-radius: 9999px;
  padding: 0 1rem;
  font-variant-numeric: tabular-nums;
  line-height: 1.6;
}
.op-player {
  background: #ffffff;
  color: #0b3954;
}
.op-crab {
  background: #e4572e;
  color: #fff;
}
.start-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(28vh, 40vw);
  height: min(28vh, 40vw);
  border-radius: 9999px;
  background: #f8c73c;
  color: #4a3200;
  box-shadow: 0 8px 0 #c98a1b, 0 16px 32px rgba(0, 0, 0, 0.3);
  animation: start-pulse 1.8s ease-in-out infinite;
}
.start-overlay {
  position: absolute;
  z-index: 20;
  left: 50%;
  top: 50%;
  width: min(20vh, 26vw);
  height: min(20vh, 26vw);
  translate: -50% -60%;
}
.start-button:active {
  transform: translateY(4px);
  box-shadow: 0 4px 0 #c98a1b, 0 8px 16px rgba(0, 0, 0, 0.3);
}
@keyframes start-pulse {
  50% { transform: scale(1.05); }
}
.larger-star {
  animation: star-in 0.5s ease-out both;
}
@keyframes star-in {
  from { transform: scale(0) rotate(-40deg); opacity: 0; }
}
.owner {
  position: absolute;
  bottom: 1.5vh;
  border-radius: 9999px;
  padding: 0.1rem 0.9rem;
  font-weight: 800;
  font-size: clamp(0.9rem, 2.4vh, 1.3rem);
}
.owner-player {
  background: #0b3954;
  color: #fff;
}
.owner-crab {
  background: #e4572e;
  color: #fff;
}
.crab-run {
  transition-property: top, margin-top;
  transition-timing-function: linear;
}
.fade-out {
  animation: fade-out linear forwards;
}
@keyframes fade-out {
  to { opacity: 0; }
}
</style>
