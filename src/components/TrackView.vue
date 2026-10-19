<script setup lang="ts">
/**
 * The race track, always visible above the treasures: ONE numbered track shared by both
 * characters, as on the original board. The child's animal stands above the squares, the crab
 * below, so both stay visible even on the same square. Anemones are shared too.
 *
 * Long tracks (30 or 40 squares) scroll: at most 20 squares are shown, so that squares stay big
 * enough to be touched one by one, and the view follows the character who is playing. When the
 * other character is out of view, a small arrow at the edge shows where it is.
 *
 * Counting is done on the square numbers (counting on), so the squares carry a clear number and
 * the pieces placed on them carry none.
 */
import { computed } from 'vue'
import CharacterSprite from './CharacterSprite.vue'
import CrabSprite from './CrabSprite.vue'
import CoinIcon from './CoinIcon.vue'
import { hazardKind } from '../engine/board'

export type Lane = 'player' | 'crab'
/** a move shown as an operation on the numbered track: 7 + 4 = 11, 11 − 2 = 9 */
export interface Operation {
  a: number
  sign: '+' | '−'
  b: number
  result: number | null
}

const props = defineProps<{
  character: string
  /** number of squares of this race */
  length: number
  player: number
  crab: number
  hazards: number[]
  /** squares holding a gold piece */
  placed: number[]
  /** squares can be tapped */
  tappable: boolean
  /** the square to touch next (gently highlighted when `hint` is on) */
  next: number | null
  hint: boolean
  shake: number | null
  hit: number | null
  crabWalking: boolean
  /** per character, the operations of this turn: shown in a bubble next to its token */
  operations: Record<Lane, Operation[]>
  /** range of squares that must be visible (the view scrolls to show it) */
  showFrom: number
  showTo: number
}>()
const emit = defineEmits<{ tap: [square: number] }>()

const CELL = 52
/** squares are taller than wide: room for a big number above the gold piece, without fewer squares in view */
const CELL_H = 66
/** squares visible at once */
const WINDOW = 20
/** top of the squares: room above for the child's animal */
const SQ_Y = 62
/** total height: room below for the crab */
const H = SQ_Y + CELL_H + 56
const VIEW_W = WINDOW * CELL + 70
/** size of the characters on the track: the child's animal above the squares, the crab below */
const TOKEN = { player: { w: 76, h: 64 }, crab: { w: 60, h: 50 } } as const
/** left edge of the finish marker shown at the right of the view on a long track */
const FINISH_MARKER_X = VIEW_W - 118
/** x of the centre of square sq (0 = start, left of square 1) */
const cx = (sq: number) => (sq - 0.5) * CELL
const squares = computed(() => Array.from({ length: props.length }, (_, k) => k + 1))

/** first square shown (0 = the start is visible) */
const offset = computed(() => {
  const max = Math.max(0, props.length - WINDOW)
  let first = Math.max(0, props.showFrom - 1)
  if (props.showTo - first > WINDOW - 1) first = props.showTo - (WINDOW - 1)
  return Math.min(max, Math.max(0, first))
})
const lastShown = computed(() => offset.value + WINDOW)
/** a character is "out" as soon as it would be cut by the edge of the view */
const out = (pos: number): 'left' | 'right' | null => (pos < offset.value + 1 && offset.value > 0 ? 'left' : pos > lastShown.value - 1 ? 'right' : null)
/**
 * Each operation is a bubble next to its own character (the child's above the track, the crab's
 * below), so that it is never attributed to the other one. It sits on the right of the token, or
 * on its left near the right edge of the view, the side being chosen once for the whole move so
 * that it never jumps across the token while counting. After a trap, the move back replaces the
 * move forward. A character out of view has no bubble (its arrow at the edge stands for it).
 */
const BUBBLE_H = 34
const bubbleText = (op: Operation) => `${op.a} ${op.sign} ${op.b} = ${op.result ?? '?'}`
const bubbles = computed(() =>
  (['player', 'crab'] as const).flatMap((lane) => {
    const list = props.operations[lane]
    const op = list[list.length - 1]
    const pos = lane === 'player' ? props.player : props.crab
    if (!op || out(pos)) return []
    const w = bubbleText(op).length * 13 + 22
    // half the token width plus room for the tail of the bubble
    const gap = TOKEN[lane].w / 2 + 16
    // rightmost square of the move: a bubble on the right must still fit there
    const furthest = op.sign === '+' ? op.a + op.b : op.a
    // the finish marker shares the row of the child's bubble
    const shift = offset.value * CELL
    const limit = lane === 'player' && props.length > lastShown.value ? Math.min((lastShown.value - 0.5) * CELL, FINISH_MARKER_X - 8 + shift) : (lastShown.value - 0.5) * CELL
    const right = cx(furthest) + gap + w <= limit
    const x = right ? cx(pos) + gap : cx(pos) - gap - w
    const y = lane === 'player' ? SQ_Y - 52 : SQ_Y + CELL_H + 10
    return [{ lane, op, w, x, y, right }]
  }),
)
</script>

<template>
  <svg :viewBox="`-62 0 ${VIEW_W} ${H}`" class="track w-full">
    <defs>
      <clipPath id="track-window"><rect x="-62" y="0" :width="VIEW_W" :height="H" /></clipPath>
    </defs>
    <g clip-path="url(#track-window)">
      <g class="track-scroll" :style="{ transform: `translateX(${-offset * CELL}px)` }">
        <rect x="-58" :y="SQ_Y - 8" :width="length * CELL + 62" :height="CELL_H + 16" rx="18" fill="#ffffff" fill-opacity="0.12" />
        <!-- start -->
        <circle cx="-29" :cy="SQ_Y + CELL_H / 2" r="21" fill="#ffffff" fill-opacity="0.12" stroke="#ffffff" stroke-opacity="0.45" stroke-dasharray="5 5" />

        <!-- squares; the tap area of each square covers the full height of the track -->
        <g
          v-for="sq in squares"
          :key="sq"
          :class="{ 'square-shake': shake === sq }"
          :data-next="next === sq ? '' : undefined"
          :style="{ transformOrigin: `${cx(sq)}px ${SQ_Y + CELL_H / 2}px` }"
          @pointerdown="tappable && emit('tap', sq)"
        >
          <rect :x="cx(sq) - CELL / 2" y="0" :width="CELL" :height="H" fill="transparent" />
          <rect
            :x="cx(sq) - CELL / 2 + 2"
            :y="SQ_Y"
            :width="CELL - 4"
            :height="CELL_H"
            rx="10"
            :data-sq="sq"
            :fill="sq === length ? '#ffe08a' : '#f3dfae'"
            stroke="#c9a96b"
            stroke-width="2"
          />
          <!-- gentle highlight of the next square, only after some hesitation -->
          <rect
            v-if="hint && next === sq"
            class="next-hint"
            :x="cx(sq) - CELL / 2 + 2"
            :y="SQ_Y"
            :width="CELL - 4"
            :height="CELL_H"
            rx="10"
            fill="#ffffff"
            fill-opacity="0.55"
            stroke="#ffffff"
            stroke-width="4"
          />
          <text :x="cx(sq)" :y="SQ_Y + 28" text-anchor="middle" class="square-number">{{ sq }}</text>
          <!-- finish flag -->
          <g v-if="sq === length" :transform="`translate(${cx(sq) + 10} ${SQ_Y - 34})`">
            <path d="M0 0 V34" stroke="#5b4a2f" stroke-width="3" />
            <path d="M2 2 H20 L15 8 L20 14 H2 Z" fill="#ef476f" />
          </g>
          <!-- gold piece, under the square number (the square number is what is counted) -->
          <g v-if="placed.includes(sq)" class="coin-pop" :style="{ transformOrigin: `${cx(sq)}px ${SQ_Y + CELL_H - 15}px` }">
            <CoinIcon :x="cx(sq)" :y="SQ_Y + CELL_H - 15" :r="12" />
          </g>
          <!-- trap (shared), drawn over the gold piece so it stays visible while counting -->
          <g v-if="hazards.includes(sq)" :transform="`translate(${cx(sq)} ${SQ_Y + CELL_H - 8}) scale(0.8)`">
            <g :class="{ 'hazard-hit': hit === sq }" :data-hazard="hazardKind(hazards, sq)">
              <template v-if="hazardKind(hazards, sq) === 'anemone'">
                <g v-for="k in 5" :key="k">
                  <path :d="`M${(k - 3) * 3} 0 Q${(k - 3) * 7} -10 ${(k - 3) * 5} -22`" stroke="#ff7eb3" stroke-width="3.5" stroke-linecap="round" fill="none" />
                  <circle :cx="(k - 3) * 5" cy="-23" r="3" fill="#ffc2dc" />
                </g>
                <path d="M-15 4 Q-13 -5 0 -5 Q13 -5 15 4 Z" fill="#d94680" />
              </template>
              <!-- sea urchin: a dark ball with spines -->
              <template v-else-if="hazardKind(hazards, sq) === 'urchin'">
                <path
                  v-for="k in 12"
                  :key="k"
                  :d="`M0 -10 L${17 * Math.cos((k * Math.PI) / 6)} ${-10 + 17 * Math.sin((k * Math.PI) / 6)}`"
                  stroke="#4b2a6e"
                  stroke-width="2.5"
                  stroke-linecap="round"
                />
                <circle cx="0" cy="-10" r="10" fill="#6a3d9a" />
                <circle cx="-3" cy="-13" r="3" fill="#9b6fd0" />
              </template>
              <!-- jellyfish: a dome with wavy tentacles -->
              <template v-else>
                <path
                  v-for="k in 4"
                  :key="k"
                  :d="`M${(k - 2.5) * 6} -12 q-3 4 0 8 q3 4 0 8`"
                  stroke="#8fd3ff"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  fill="none"
                />
                <path d="M-14 -11 Q-14 -30 0 -30 Q14 -30 14 -11 Q7 -14 0 -11 Q-7 -14 -14 -11 Z" fill="#b48cff" fill-opacity="0.9" />
                <circle cx="-5" cy="-21" r="2" fill="#2a1d4a" />
                <circle cx="5" cy="-21" r="2" fill="#2a1d4a" />
              </template>
            </g>
          </g>
        </g>

        <!-- characters, drawn last so they stay on top: the child above the track, the crab below -->
        <g class="token" :style="{ transform: `translate(${cx(player) - TOKEN.player.w / 2}px, ${SQ_Y - 62}px)` }">
          <svg :width="TOKEN.player.w" :height="TOKEN.player.h" class="overflow-visible"><CharacterSprite :id="character" /></svg>
        </g>
        <g class="token" data-token="crab" :style="{ transform: `translate(${cx(crab) - TOKEN.crab.w / 2}px, ${SQ_Y + CELL_H + 2}px)` }">
          <svg :width="TOKEN.crab.w" :height="TOKEN.crab.h" class="overflow-visible"><CrabSprite :walking="crabWalking" /></svg>
        </g>

        <!-- the operation of each character, in a bubble next to its token -->
        <g v-for="b in bubbles" :key="b.lane" class="bubble" :data-bubble="b.lane" :style="{ transform: `translate(${b.x}px, ${b.y}px)` }">
          <path
            :d="b.right ? `M0 ${BUBBLE_H / 2 - 6} L-9 ${BUBBLE_H / 2} L0 ${BUBBLE_H / 2 + 6} Z` : `M${b.w} ${BUBBLE_H / 2 - 6} L${b.w + 9} ${BUBBLE_H / 2} L${b.w} ${BUBBLE_H / 2 + 6} Z`"
            fill="#ffffff"
          />
          <rect x="0" y="0" :width="b.w" :height="BUBBLE_H" :rx="BUBBLE_H / 2" fill="#ffffff" />
          <text :x="b.w / 2" :y="BUBBLE_H / 2 + 8" text-anchor="middle" class="bubble-text">
            {{ b.op.a }} {{ b.op.sign }} {{ b.op.b }} = <tspan :class="{ 'opacity-0': b.op.result === null }">{{ b.op.result ?? '?' }}</tspan>
          </text>
        </g>
      </g>
    </g>

    <!-- the finish, when it is out of view on a long track -->
    <g v-if="length > lastShown" :transform="`translate(${FINISH_MARKER_X} ${SQ_Y - 32})`" class="edge-marker">
      <path d="M0 0 V30" stroke="#ffffff" stroke-opacity="0.8" stroke-width="3" />
      <path d="M2 2 H20 L15 8 L20 14 H2 Z" fill="#ef476f" />
      <text x="24" y="14" class="finish-label">{{ length }}</text>
    </g>

    <!-- where the other character is, when it is out of view -->
    <g v-for="who in (['player', 'crab'] as const)" :key="who">
      <g
        v-if="out(who === 'player' ? player : crab)"
        :transform="`translate(${out(who === 'player' ? player : crab) === 'left' ? -50 : VIEW_W - 100} ${who === 'player' ? 8 : SQ_Y + CELL_H + 8})`"
        class="edge-marker"
      >
        <rect x="0" y="0" width="38" height="38" rx="19" fill="#0b3954" fill-opacity="0.55" />
        <svg x="3" y="5" width="32" height="28" class="overflow-visible">
          <CharacterSprite v-if="who === 'player'" :id="character" />
          <CrabSprite v-else />
        </svg>
        <path
          :d="out(who === 'player' ? player : crab) === 'left' ? 'M-4 19 l8 -7 v14 z' : 'M42 19 l-8 -7 v14 z'"
          fill="#ffffff"
        />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.track {
  touch-action: manipulation;
}
.track-scroll {
  transition: transform 0.6s ease-in-out;
}
.token {
  transition: transform 0.11s ease-out;
  pointer-events: none;
}
.edge-marker {
  pointer-events: none;
}
.bubble {
  transition: transform 0.11s ease-out;
  pointer-events: none;
  filter: drop-shadow(0 2px 3px rgba(0, 20, 40, 0.35));
}
.bubble-text {
  font-weight: 800;
  font-size: 22px;
  fill: #0b3954;
  font-variant-numeric: tabular-nums;
}
.finish-label {
  font-weight: 800;
  font-size: 15px;
  fill: #ffffff;
}
.square-number {
  font-weight: 800;
  font-size: 27px;
  fill: #5a3d12;
  pointer-events: none;
}
.coin-pop {
  animation: pop 0.22s ease-out both;
}
@keyframes pop {
  from { transform: scale(0.2); opacity: 0; }
}
.next-hint {
  animation: next-hint 1.2s ease-in-out infinite;
  pointer-events: none;
}
@keyframes next-hint {
  50% { fill-opacity: 0.1; stroke-opacity: 0.4; }
}
.square-shake {
  animation: shake 0.4s ease-in-out;
}
@keyframes shake {
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
.hazard-hit {
  animation: pulse 0.5s ease-in-out 2;
}
@keyframes pulse {
  50% { transform: scale(1.3); }
}
</style>
