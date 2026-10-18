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

export type Lane = 'player' | 'crab'

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
  /** range of squares that must be visible (the view scrolls to show it) */
  showFrom: number
  showTo: number
}>()
const emit = defineEmits<{ tap: [square: number] }>()

const CELL = 52
/** squares visible at once */
const WINDOW = 20
/** top of the squares: room above for the child's animal */
const SQ_Y = 62
/** total height: room below for the crab */
const H = SQ_Y + CELL + 56
const VIEW_W = WINDOW * CELL + 70
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
</script>

<template>
  <svg :viewBox="`-62 0 ${VIEW_W} ${H}`" class="track w-full">
    <defs>
      <clipPath id="track-window"><rect x="-62" y="0" :width="VIEW_W" :height="H" /></clipPath>
    </defs>
    <g clip-path="url(#track-window)">
      <g class="track-scroll" :style="{ transform: `translateX(${-offset * CELL}px)` }">
        <rect x="-58" :y="SQ_Y - 8" :width="length * CELL + 62" :height="CELL + 16" rx="18" fill="#ffffff" fill-opacity="0.12" />
        <!-- start -->
        <circle cx="-29" :cy="SQ_Y + CELL / 2" r="21" fill="#ffffff" fill-opacity="0.12" stroke="#ffffff" stroke-opacity="0.45" stroke-dasharray="5 5" />

        <!-- squares; the tap area of each square covers the full height of the track -->
        <g
          v-for="sq in squares"
          :key="sq"
          :class="{ 'square-shake': shake === sq }"
          :data-next="next === sq ? '' : undefined"
          :style="{ transformOrigin: `${cx(sq)}px ${SQ_Y + CELL / 2}px` }"
          @pointerdown="tappable && emit('tap', sq)"
        >
          <rect :x="cx(sq) - CELL / 2" y="0" :width="CELL" :height="H" fill="transparent" />
          <rect
            :x="cx(sq) - CELL / 2 + 2"
            :y="SQ_Y"
            :width="CELL - 4"
            :height="CELL"
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
            :height="CELL"
            rx="10"
            fill="#ffffff"
            fill-opacity="0.55"
            stroke="#ffffff"
            stroke-width="4"
          />
          <text :x="cx(sq)" :y="SQ_Y + 19" text-anchor="middle" class="square-number">{{ sq }}</text>
          <!-- finish flag -->
          <g v-if="sq === length" :transform="`translate(${cx(sq) + 10} ${SQ_Y - 34})`">
            <path d="M0 0 V34" stroke="#5b4a2f" stroke-width="3" />
            <path d="M2 2 H20 L15 8 L20 14 H2 Z" fill="#ef476f" />
          </g>
          <!-- gold piece, under the square number (the square number is what is counted) -->
          <g v-if="placed.includes(sq)" class="coin-pop" :style="{ transformOrigin: `${cx(sq)}px ${SQ_Y + CELL - 15}px` }">
            <CoinIcon :x="cx(sq)" :y="SQ_Y + CELL - 15" :r="12" />
          </g>
          <!-- anemone (shared), drawn over the gold piece so it stays visible while counting -->
          <g v-if="hazards.includes(sq)" :transform="`translate(${cx(sq)} ${SQ_Y + CELL - 8}) scale(0.8)`">
            <g :class="{ 'anemone-hit': hit === sq }">
              <g v-for="k in 5" :key="k">
                <path :d="`M${(k - 3) * 3} 0 Q${(k - 3) * 7} -10 ${(k - 3) * 5} -22`" stroke="#ff7eb3" stroke-width="3.5" stroke-linecap="round" fill="none" />
                <circle :cx="(k - 3) * 5" cy="-23" r="3" fill="#ffc2dc" />
              </g>
              <path d="M-15 4 Q-13 -5 0 -5 Q13 -5 15 4 Z" fill="#d94680" />
            </g>
          </g>
        </g>

        <!-- characters, drawn last so they stay on top: the child above the track, the crab below -->
        <g class="token" :style="{ transform: `translate(${cx(player) - 38}px, ${SQ_Y - 62}px)` }">
          <svg width="76" height="64" class="overflow-visible"><CharacterSprite :id="character" /></svg>
        </g>
        <g class="token" :style="{ transform: `translate(${cx(crab) - 30}px, ${SQ_Y + CELL + 2}px)` }">
          <svg width="60" height="50" class="overflow-visible"><CrabSprite :walking="crabWalking" /></svg>
        </g>
      </g>
    </g>

    <!-- the finish, when it is out of view on a long track -->
    <g v-if="length > lastShown" :transform="`translate(${VIEW_W - 118} ${SQ_Y - 32})`" class="edge-marker">
      <path d="M0 0 V30" stroke="#ffffff" stroke-opacity="0.8" stroke-width="3" />
      <path d="M2 2 H20 L15 8 L20 14 H2 Z" fill="#ef476f" />
      <text x="24" y="14" class="finish-label">{{ length }}</text>
    </g>

    <!-- where the other character is, when it is out of view -->
    <g v-for="who in (['player', 'crab'] as const)" :key="who">
      <g
        v-if="out(who === 'player' ? player : crab)"
        :transform="`translate(${out(who === 'player' ? player : crab) === 'left' ? -50 : VIEW_W - 100} ${who === 'player' ? 8 : SQ_Y + CELL + 8})`"
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
.finish-label {
  font-weight: 800;
  font-size: 15px;
  fill: #ffffff;
}
.square-number {
  font-weight: 800;
  font-size: 17px;
  fill: #6b4c1c;
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
.anemone-hit {
  animation: pulse 0.5s ease-in-out 2;
}
@keyframes pulse {
  50% { transform: scale(1.3); }
}
</style>
