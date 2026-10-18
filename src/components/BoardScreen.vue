<script setup lang="ts">
/**
 * Board screen: number ↔ space. The child moves by placing the gold pieces won on the squares in
 * one-to-one correspondence (counted aloud), or by clicking directly on the arrival square.
 * Then the crab moves with its own pieces.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { BOARD_LENGTH, HAZARD_PENALTY, move, positionComment } from '../engine/board'
import { numberWord } from '../data/words'
import { hush, say } from '../composables/useSpeech'
import { sounds } from '../composables/useSounds'
import { useSettings } from '../composables/useSettings'
import CharacterSprite from './CharacterSprite.vue'
import CrabSprite from './CrabSprite.vue'
import CoinIcon from './CoinIcon.vue'

const props = defineProps<{
  character: string
  player: number
  crab: number
  playerSteps: number
  crabSteps: number
  hazards: number[]
}>()
const emit = defineEmits<{ done: [player: number, crab: number, winner: 'player' | 'crab' | null] }>()

const settings = useSettings()
const playerPos = ref(props.player)
const crabPos = ref(props.crab)
/** squares currently holding a gold piece */
const placed = ref<number[]>([])
/** pieces the child has put down (the squares are emptied as the character passes) */
const placedCount = ref(0)
const turn = ref<'player' | 'crab' | 'over'>('player')
const busy = ref(false)
const shake = ref<number | null>(null)
const message = ref('')
const hit = ref<number | null>(null)

const playerTarget = computed(() => Math.min(BOARD_LENGTH, props.player + props.playerSteps))
const piecesToPlace = computed(() => playerTarget.value - props.player)
const trayLeft = computed(() => (turn.value === 'player' ? piecesToPlace.value - placedCount.value : 0))

let alive = true
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
onBeforeUnmount(() => {
  alive = false
  hush()
})

/* --- geometry: 30 squares in a snake of three rows of ten --- */
const COLS = 10
const CELL = 84
const GAP = 10
const X0 = 140
const Y0 = 70
const ROW_H = 150
function center(sq: number): { x: number; y: number } {
  if (sq <= 0) return { x: 50, y: Y0 }
  const row = Math.floor((sq - 1) / COLS)
  const col = (sq - 1) % COLS
  const c = row % 2 === 0 ? col : COLS - 1 - col
  return { x: X0 + c * (CELL + GAP), y: Y0 + row * ROW_H }
}
const squares = Array.from({ length: BOARD_LENGTH }, (_, k) => ({ sq: k + 1, ...center(k + 1) }))
/** path through the squares, drawn under them */
const path = computed(() => ['M', 50, Y0, ...squares.flatMap((s) => ['L', s.x, s.y])].join(' '))

onMounted(async () => {
  await say(`Avance de ${numberWord(piecesToPlace.value)} case${piecesToPlace.value > 1 ? 's' : ''}.`)
  if (settings.autoMove && alive) await placeAll(false)
})

/* --- player's turn --- */
async function placeOne(): Promise<void> {
  if (turn.value !== 'player' || busy.value || trayLeft.value <= 0) return
  busy.value = true
  placedCount.value++
  placed.value.push(props.player + placedCount.value)
  sounds.coin(placedCount.value)
  await say(numberWord(placedCount.value), 1.15)
  busy.value = false
  if (trayLeft.value === 0) await moveCharacter('player')
}

async function placeAll(fast: boolean): Promise<void> {
  busy.value = true
  while (alive && placedCount.value < piecesToPlace.value) {
    placedCount.value++
    placed.value.push(props.player + placedCount.value)
    sounds.coin(placedCount.value)
    await say(numberWord(placedCount.value), fast ? 1.3 : 1.15)
  }
  busy.value = false
  if (alive) await moveCharacter('player')
}

async function clickSquare(sq: number): Promise<void> {
  if (turn.value !== 'player' || busy.value || trayLeft.value <= 0) return
  if (sq === playerTarget.value) {
    await placeAll(true)
  } else if (sq > props.player) {
    shake.value = sq
    setTimeout(() => (shake.value = null), 450)
  }
}

/* --- moving a character along the placed pieces --- */
async function hop(who: 'player' | 'crab', to: number): Promise<void> {
  const pos = who === 'player' ? playerPos : crabPos
  const step = to > pos.value ? 1 : -1
  while (alive && pos.value !== to) {
    pos.value += step
    placed.value = placed.value.filter((s) => s !== pos.value)
    sounds.hop()
    await wait(160)
  }
}

async function moveCharacter(who: 'player' | 'crab'): Promise<void> {
  busy.value = true
  const pos = who === 'player' ? playerPos : crabPos
  const steps = who === 'player' ? props.playerSteps : props.crabSteps
  const m = move(pos.value, steps, props.hazards)
  await hop(who, m.landing)
  placed.value = []
  if (m.hitHazard && alive) {
    hit.value = m.landing
    sounds.ouch()
    message.value = who === 'player' ? 'Aïe, une anémone !' : 'Aïe ! Le crabe est tombé sur une anémone !'
    await say(`${message.value} ${who === 'player' ? 'Tu recules' : 'Il recule'} de ${numberWord(HAZARD_PENALTY)} cases.`)
    await hop(who, m.to)
    hit.value = null
    message.value = ''
  }
  if (!alive) return
  if (m.finished) {
    turn.value = 'over'
    await wait(400)
    emit('done', playerPos.value, crabPos.value, who)
    return
  }
  if (who === 'player') await crabTurn()
  else await endTurn()
}

async function crabTurn(): Promise<void> {
  turn.value = 'crab'
  await wait(500)
  const target = Math.min(BOARD_LENGTH, crabPos.value + props.crabSteps)
  for (let k = 1; alive && crabPos.value + k <= target; k++) {
    placed.value.push(crabPos.value + k)
    sounds.coin(k)
    await say(numberWord(k), 1.3)
  }
  if (alive) await moveCharacter('crab')
}

async function endTurn(): Promise<void> {
  turn.value = 'over'
  const comment = positionComment(props.player, props.crab, playerPos.value, crabPos.value)
  if (comment) {
    message.value = comment
    await say(comment)
  }
  await wait(500)
  if (alive) emit('done', playerPos.value, crabPos.value, null)
}
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center gap-[2vh] px-[3vw] py-[2vh]">
    <svg viewBox="0 0 1100 420" class="max-h-[68vh] w-full max-w-6xl">
      <path :d="path" stroke="#ffffff" stroke-opacity="0.25" stroke-width="14" fill="none" stroke-linejoin="round" />
      <!-- start -->
      <circle cx="50" :cy="Y0" r="34" fill="#ffffff" fill-opacity="0.15" stroke="#ffffff" stroke-opacity="0.5" stroke-dasharray="6 6" />
      <!-- squares -->
      <g
        v-for="s in squares"
        :key="s.sq"
        :class="{ 'square-shake': shake === s.sq, 'cursor-pointer': turn === 'player' && s.sq > player && trayLeft > 0 }"
        :style="{ transformOrigin: `${s.x}px ${s.y}px` }"
        @click="clickSquare(s.sq)"
      >
        <rect
          :x="s.x - CELL / 2"
          :y="s.y - CELL / 2"
          :width="CELL"
          :height="CELL"
          rx="18"
          :fill="s.sq === BOARD_LENGTH ? '#ffe08a' : '#f3dfae'"
          stroke="#c9a96b"
          stroke-width="3"
        />
        <!-- finish flag -->
        <g v-if="s.sq === BOARD_LENGTH" :transform="`translate(${s.x + 14} ${s.y - 36})`">
          <path d="M0 0 V40" stroke="#5b4a2f" stroke-width="4" />
          <path d="M2 2 H26 L20 10 L26 18 H2 Z" fill="#ef476f" />
        </g>
        <!-- anemone hazard -->
        <g v-if="hazards.includes(s.sq)" :transform="`translate(${s.x} ${s.y + 14})`"><g :class="{ 'anemone-hit': hit === s.sq }">
          <g v-for="k in 7" :key="k">
            <path :d="`M${(k - 4) * 4} 0 Q${(k - 4) * 9} -14 ${(k - 4) * 7} -28`" stroke="#ff7eb3" stroke-width="4" stroke-linecap="round" fill="none" />
            <circle :cx="(k - 4) * 7" cy="-29" r="3.6" fill="#ffc2dc" />
          </g>
          <path d="M-20 4 Q-18 -6 0 -6 Q18 -6 20 4 Z" fill="#d94680" />
        </g></g>
        <CoinIcon v-if="placed.includes(s.sq)" :x="s.x" :y="s.y" :r="20" />
      </g>
      <!-- characters -->
      <g class="token" :style="{ transform: `translate(${center(crabPos).x - 30}px, ${center(crabPos).y - 10}px)` }">
        <svg width="62" height="52"><CrabSprite :walking="turn === 'crab' && busy" /></svg>
      </g>
      <g class="token" :style="{ transform: `translate(${center(playerPos).x - 46}px, ${center(playerPos).y - 74}px)` }">
        <svg width="92" height="76"><CharacterSprite :id="character" /></svg>
      </g>
    </svg>

    <!-- tray of gold pieces won by the child -->
    <div class="flex h-[12vh] min-h-16 items-center gap-3 rounded-full bg-white/10 px-6">
      <template v-if="turn === 'player' && trayLeft > 0">
        <button
          v-for="k in trayLeft"
          :key="k"
          type="button"
          class="h-[9vh] min-h-12 w-[9vh] min-w-12 transition hover:-translate-y-1 active:scale-95"
          :aria-label="`pièce ${k}`"
          @click="placeOne"
        >
          <svg viewBox="-12 -12 24 24"><CoinIcon :r="11" /></svg>
        </button>
      </template>
      <p v-else class="px-4 text-2xl font-bold text-white" aria-live="polite">{{ message || (turn === 'crab' ? 'Au tour du crabe…' : '') }}</p>
    </div>
  </div>
</template>

<style scoped>
.token {
  transition: transform 0.15s ease-out;
}
.square-shake {
  animation: shake 0.45s ease-in-out;
}
@keyframes shake {
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}
.anemone-hit {
  animation: pulse 0.6s ease-in-out 2;
}
@keyframes pulse {
  50% { transform: scale(1.25); }
}
</style>
