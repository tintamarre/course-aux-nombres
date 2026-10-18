<script lang="ts">
/** module scope: the "how to move" hint is spoken once per visit, not at every turn */
let hintGiven = false
</script>

<script setup lang="ts">
/**
 * One turn of the race on a single screen: the track stays visible above the two treasures.
 *
 * 1. choose: the child touches the larger treasure (before the crab reaches the key when there is
 *    a deadline). What is shown before the choice depends on the complexity level (Table 1).
 * 2. reveal: both treasures in the three formats (pieces, digit, spoken word).
 * 3. move: the child puts the pieces won on the squares one by one (each touch on the treasure
 *    places one piece, counted aloud) or touches the arrival square directly.
 * 4. crab: the crab does the same with the other treasure.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Problem, Quantity, Side } from '../engine/problem'
import { BOX, layoutDots } from '../engine/dots'
import { BOARD_LENGTH, HAZARD_PENALTY, move, positionComment } from '../engine/board'
import { NUMBER_WORDS, numberWord, operationWords } from '../data/words'
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
  /** anemones, shared by both characters */
  hazards: number[]
}>()
const emit = defineEmits<{
  choice: [choice: Side | null, rt: number]
  done: [player: number, crab: number, winner: Lane | null]
}>()

const settings = useSettings()
type Phase = 'choose' | 'reveal' | 'move' | 'crab' | 'end'
const phase = ref<Phase>('choose')
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
const operations = ref<Record<Lane, Operation | null>>({ player: null, crab: null })
const setOperation = (lane: Lane, op: Operation) => (operations.value[lane] = op)

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
  return Math.min(BOARD_LENGTH, from + q(sideOf(lane)).value) - from
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

onMounted(async () => {
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
})

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
    await say(`${operationWords(op.a, op.op, op.b)}, égale ${numberWord(q(opSide).value)}.`)
    if (!alive) return
    await wait(400)
    opStep.value = 3
  }

  // 2. describe the comparison: what the child got, and why it is (or is not) the most
  const big = q(props.problem.larger).value
  const small = q(other(props.problem.larger)).value
  // "plus" is always followed by "grand": speech engines read a final "le plus" as "le plu"
  message.value = `${big}, c'est plus grand que ${small}.`
  const verdict = timedOut.value
    ? 'Trop tard ! Le crabe a pris le plus grand trésor.'
    : correct.value
      ? 'Bravo, tu as le plus grand trésor !'
      : 'Le crabe a le plus grand trésor !'
  await say(`${timedOut.value ? 'Tu as' : 'Tu as choisi'} ${numberWord(q(choice.value).value)}. ${numberWord(big)}, c'est plus grand que ${numberWord(small)}.`)
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
  } else if (!hintGiven) {
    hintTimer = setTimeout(() => {
      if (alive && placedCount.value.player === 0 && !busy.value) {
        hintGiven = true
        void say('Touche tes pièces pour avancer !')
      }
    }, 3500)
  }
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

/* ---------- 3. counting the pieces onto the track ----------
 * Counting follows the paper: the pieces are counted (« un, deux, trois, quatre »), each piece
 * flies from the treasure to its square and shows the number just said, then the total is said
 * again (cardinal principle: « Quatre ! ») and the arrival square is announced (« Case onze. »).
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
function placeOne(lane: Lane) {
  placedCount.value[lane]++
  const k = placedCount.value[lane]
  const from = lane === 'player' ? props.player : props.crab
  sounds.coin(k)
  const flight = fly(sideOf(lane), from + k).then(() => {
    if (alive) placed.value[lane].push(from + k)
  })
  lastFlight = lastFlight.then(() => flight)
}

function tapTreasure(s: Side) {
  if (phase.value === 'choose') {
    void choose(s)
    return
  }
  if (phase.value !== 'move' || busy.value || s !== choice.value || piecesLeft('player') <= 0) return
  placeOne('player')
  sayNow(numberWord(placedCount.value.player))
  if (piecesLeft('player') === 0) {
    busy.value = true
    void lastFlight.then(() => {
      if (alive) void moveCharacter('player')
    })
  }
}

/** Arrival-square shortcut and automatic mode: the pieces are counted onto the track by the computer. */
async function placeAll() {
  busy.value = true
  placed.value.player = []
  placedCount.value.player = 0
  await countPieces('player')
  if (alive) await moveCharacter('player')
}

function tapSquare(sq: number) {
  if (phase.value !== 'move' || busy.value || piecesLeft('player') <= 0) return
  if (sq === playerTarget.value) void placeAll()
  else if (sq > props.player) {
    shake.value = sq
    setTimeout(() => (shake.value = null), 400)
  }
}

/** Count the pieces aloud, one flight per number. */
async function countPieces(lane: Lane) {
  await countAloud(NUMBER_WORDS.slice(1, piecesFor(lane) + 1), () => placeOne(lane), lane === 'crab' ? 1.3 : 1.15)
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

/** The pieces are on the track: say the total, walk along them, announce the arrival square. */
async function moveCharacter(lane: Lane) {
  busy.value = true
  const pos = lane === 'player' ? playerPos : crabPos
  const m = move(pos.value, q(sideOf(lane)).value, props.hazards)
  const n = m.landing - m.from
  setOperation(lane, { a: m.from, sign: '+', b: n, result: null })
  await say(`${numberWord(n)} !`)
  if (!alive) return
  await hop(lane, m.landing)
  setOperation(lane, { a: m.from, sign: '+', b: n, result: m.landing })
  if (!m.hitHazard) await say(m.finished ? 'Arrivé !' : `Case ${numberWord(m.landing)}.`)
  await finishMove(lane, m)
}

async function finishMove(lane: Lane, m: ReturnType<typeof move>) {
  placed.value[lane] = []
  if (m.hitHazard && alive) {
    await wait(300)
    setOperation(lane, { a: m.landing, sign: '−', b: m.landing - m.to, result: null })
    hit.value = { lane, square: m.landing }
    sounds.ouch()
    message.value = lane === 'player' ? `Aïe, une anémone ! Tu recules de ${HAZARD_PENALTY}.` : `Le crabe tombe sur une anémone !`
    await say(lane === 'player' ? `Aïe, une anémone ! Tu recules de ${numberWord(HAZARD_PENALTY)}.` : message.value)
    await hop(lane, m.to)
    setOperation(lane, { a: m.landing, sign: '−', b: m.landing - m.to, result: m.to })
    hit.value = null
    await say(`Case ${numberWord(m.to)}.`)
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
  const comment = positionComment(props.player, props.crab, playerPos.value, crabPos.value)
  if (comment) {
    message.value = comment
    await say(comment)
  } else await wait(250)
  if (alive) emit('done', playerPos.value, crabPos.value, null)
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
        :placed="phase === 'crab' ? placed.crab : placed.player"
        :tappable="phase === 'move' && !busy"
        :shake="shake"
        :hit="hit?.square ?? null"
        :crab-walking="phase === 'crab' && busy"
        @tap="tapSquare"
      />
    </div>

    <div class="flex h-[6vh] shrink-0 items-center justify-center gap-4 text-[clamp(1rem,3vh,1.6rem)] font-bold text-white" aria-live="polite">
      <template v-for="lane in (['player', 'crab'] as const)" :key="lane">
        <span v-if="operations[lane]" class="op-chip" :class="lane === 'player' ? 'op-player' : 'op-crab'">
          {{ operations[lane]!.a }} {{ operations[lane]!.sign }} {{ operations[lane]!.b }} =
          <span :class="{ 'opacity-0': operations[lane]!.result === null }">{{ operations[lane]!.result ?? '?' }}</span>
        </span>
      </template>
      <span class="drop-shadow">{{ message }}</span>
    </div>

    <!-- the two treasures, with the key and the crab in between when there is a deadline -->
    <div class="mx-auto grid min-h-0 w-full max-w-6xl flex-1 grid-cols-[1fr_auto_1fr] gap-[2vw] px-[3vw] pb-[3vh]">
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
          <div v-if="q(s).operation" class="number text-[13vh] leading-none text-[#12263a]">
            {{ q(s).operation!.a }}<span class="mx-[0.15em]">{{ q(s).operation!.op === '+' ? '+' : '−' }}</span>{{ q(s).operation!.b }}
          </div>
          <template v-else>
            <div v-if="lvl.digits" class="number text-[11vh] leading-none text-[#12263a]">{{ q(s).value }}</div>
            <svg
              v-if="lvl.dots"
              :viewBox="`0 0 ${BOX} ${BOX}`"
              class="h-full max-h-[34vh] min-h-0 w-full"
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
          <div class="number text-[10vh] leading-none text-[#12263a]">
            <template v-if="q(s).operation">
              {{ q(s).operation!.a }} {{ q(s).operation!.op === '+' ? '+' : '−' }} {{ q(s).operation!.b }}
              <span v-if="opStep >= 2"> = {{ q(s).value }}</span>
            </template>
            <template v-else>{{ q(s).value }}</template>
          </div>
          <CoinRows v-bind="revealCoins(s)" :waiting="phase === 'move' && choice === s && !busy" class="mt-[2vh] h-[19vh]" />
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
