<script setup lang="ts">
/**
 * The race track, always visible above the treasures: ONE numbered track shared by both
 * characters, as on the original board. The child's animal stands above the squares, the crab
 * below, so both stay visible even on the same square. Anemones are shared too.
 */
import { BOARD_LENGTH } from '../engine/board'
import CharacterSprite from './CharacterSprite.vue'
import CrabSprite from './CrabSprite.vue'
import CoinIcon from './CoinIcon.vue'

export type Lane = 'player' | 'crab'

defineProps<{
  character: string
  player: number
  crab: number
  hazards: number[]
  /** squares holding one of the child's gold pieces */
  placed: number[]
  /** squares can be tapped (arrival-square shortcut) */
  tappable: boolean
  shake: number | null
  hit: number | null
  crabWalking: boolean
}>()
const emit = defineEmits<{ tap: [square: number] }>()

const CELL = 52
/** top of the squares: room above for the child's animal */
const SQ_Y = 62
/** total height: room below for the crab */
const H = SQ_Y + CELL + 56
/** x of the centre of square sq (0 = start, left of square 1) */
const cx = (sq: number) => (sq - 0.5) * CELL
const squares = Array.from({ length: BOARD_LENGTH }, (_, k) => k + 1)
</script>

<template>
  <svg :viewBox="`-62 0 ${BOARD_LENGTH * CELL + 70} ${H}`" class="track w-full">
    <rect x="-58" :y="SQ_Y - 8" :width="BOARD_LENGTH * CELL + 62" :height="CELL + 16" rx="18" fill="#ffffff" fill-opacity="0.12" />
    <!-- start -->
    <circle cx="-29" :cy="SQ_Y + CELL / 2" r="21" fill="#ffffff" fill-opacity="0.12" stroke="#ffffff" stroke-opacity="0.45" stroke-dasharray="5 5" />

    <!-- squares; the tap area of each square covers the full height of the track -->
    <g
      v-for="sq in squares"
      :key="sq"
      :class="{ 'square-shake': shake === sq }"
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
        :fill="sq === BOARD_LENGTH ? '#ffe08a' : '#f3dfae'"
        stroke="#c9a96b"
        stroke-width="2"
      />
      <text :x="cx(sq)" :y="SQ_Y + 17" text-anchor="middle" class="square-number">{{ sq }}</text>
      <!-- finish flag -->
      <g v-if="sq === BOARD_LENGTH" :transform="`translate(${cx(sq) + 10} ${SQ_Y - 34})`">
        <path d="M0 0 V34" stroke="#5b4a2f" stroke-width="3" />
        <path d="M2 2 H20 L15 8 L20 14 H2 Z" fill="#ef476f" />
      </g>
      <!-- anemone (shared) -->
      <g v-if="hazards.includes(sq)" :transform="`translate(${cx(sq)} ${SQ_Y + CELL - 8}) scale(0.8)`">
        <g :class="{ 'anemone-hit': hit === sq }">
          <g v-for="k in 5" :key="k">
            <path :d="`M${(k - 3) * 3} 0 Q${(k - 3) * 7} -10 ${(k - 3) * 5} -22`" stroke="#ff7eb3" stroke-width="3.5" stroke-linecap="round" fill="none" />
            <circle :cx="(k - 3) * 5" cy="-23" r="3" fill="#ffc2dc" />
          </g>
          <path d="M-15 4 Q-13 -5 0 -5 Q13 -5 15 4 Z" fill="#d94680" />
        </g>
      </g>
      <!-- gold piece, under the square number -->
      <g v-if="placed.includes(sq)" class="coin-pop" :style="{ transformOrigin: `${cx(sq)}px ${SQ_Y + CELL - 15}px` }">
        <CoinIcon :x="cx(sq)" :y="SQ_Y + CELL - 15" :r="12" />
      </g>
    </g>

    <!-- characters, drawn last so they stay on top: the child above the track, the crab below -->
    <g class="token" :style="{ transform: `translate(${cx(player) - 38}px, ${SQ_Y - 62}px)` }">
      <svg width="76" height="64" class="overflow-visible"><CharacterSprite :id="character" /></svg>
    </g>
    <g class="token" :style="{ transform: `translate(${cx(crab) - 30}px, ${SQ_Y + CELL + 2}px)` }">
      <svg width="60" height="50" class="overflow-visible"><CrabSprite :walking="crabWalking" /></svg>
    </g>
  </svg>
</template>

<style scoped>
.track {
  touch-action: manipulation;
}
.token {
  transition: transform 0.11s ease-out;
  pointer-events: none;
}
.square-number {
  font-weight: 800;
  font-size: 16px;
  fill: #7a5a24;
  pointer-events: none;
}
.coin-pop {
  animation: pop 0.22s ease-out both;
}
@keyframes pop {
  from { transform: scale(0.2); opacity: 0; }
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
