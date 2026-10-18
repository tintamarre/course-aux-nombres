<script setup lang="ts">
/**
 * The race track: one horizontal lane per character (child on top, crab below), always visible
 * above the treasures. Gold pieces placed on the squares carry their count (1, 2, 3…).
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
  hazards: Record<Lane, number[]>
  /** squares holding a gold piece, per lane, in placement order */
  placed: Record<Lane, number[]>
  /** squares of the player's lane can be tapped */
  tappable: boolean
  shake: number | null
  hit: { lane: Lane; square: number } | null
  crabWalking: boolean
}>()
const emit = defineEmits<{ tap: [square: number] }>()

const CELL = 48
const X0 = 0
const LANE_H = 96
const GAP = 16
const lanes: Lane[] = ['player', 'crab']
const laneY = (lane: Lane) => (lane === 'player' ? 0 : LANE_H + GAP)
/** x of the centre of square sq (0 = start, left of square 1) */
const cx = (sq: number) => X0 + (sq - 0.5) * CELL
const squares = Array.from({ length: BOARD_LENGTH }, (_, k) => k + 1)
</script>

<template>
  <svg :viewBox="`-58 -6 ${BOARD_LENGTH * CELL + 66} ${2 * LANE_H + GAP + 12}`" class="track w-full">
    <g v-for="lane in lanes" :key="lane" :transform="`translate(0 ${laneY(lane)})`">
      <rect x="-54" y="0" :width="BOARD_LENGTH * CELL + 58" :height="LANE_H" rx="22" fill="#ffffff" fill-opacity="0.12" />
      <!-- squares (the tap area of each square covers the full lane height) -->
      <g
        v-for="sq in squares"
        :key="sq"
        :class="{ 'square-shake': lane === 'player' && shake === sq }"
        :style="{ transformOrigin: `${cx(sq)}px ${LANE_H / 2}px` }"
        @pointerdown="lane === 'player' && tappable && emit('tap', sq)"
      >
        <rect :x="cx(sq) - CELL / 2" y="0" :width="CELL" :height="LANE_H" fill="transparent" />
        <rect
          :x="cx(sq) - CELL / 2 + 2"
          :y="LANE_H - CELL - 6"
          :width="CELL - 4"
          :height="CELL"
          rx="10"
          :fill="sq === BOARD_LENGTH ? '#ffe08a' : '#f3dfae'"
          stroke="#c9a96b"
          stroke-width="2"
        />
        <!-- finish flag -->
        <g v-if="sq === BOARD_LENGTH" :transform="`translate(${cx(sq) + 8} ${LANE_H - CELL - 34})`">
          <path d="M0 0 V34" stroke="#5b4a2f" stroke-width="3" />
          <path d="M2 2 H20 L15 8 L20 14 H2 Z" fill="#ef476f" />
        </g>
        <!-- anemone -->
        <g v-if="hazards[lane].includes(sq)" :transform="`translate(${cx(sq)} ${LANE_H - 14})`">
          <g :class="{ 'anemone-hit': hit?.lane === lane && hit.square === sq }">
            <g v-for="k in 5" :key="k">
              <path :d="`M${(k - 3) * 3} 0 Q${(k - 3) * 7} -10 ${(k - 3) * 5} -22`" stroke="#ff7eb3" stroke-width="3.5" stroke-linecap="round" fill="none" />
              <circle :cx="(k - 3) * 5" cy="-23" r="3" fill="#ffc2dc" />
            </g>
            <path d="M-15 4 Q-13 -5 0 -5 Q13 -5 15 4 Z" fill="#d94680" />
          </g>
        </g>
        <!-- gold piece with its count -->
        <g v-if="placed[lane].includes(sq)" class="coin-pop" :style="{ transformOrigin: `${cx(sq)}px ${LANE_H - CELL / 2 - 6}px` }">
          <CoinIcon :x="cx(sq)" :y="LANE_H - CELL / 2 - 6" :r="17" />
          <text :x="cx(sq)" :y="LANE_H - CELL / 2" text-anchor="middle" class="coin-count">{{ placed[lane].indexOf(sq) + 1 }}</text>
        </g>
      </g>
      <!-- start -->
      <circle cx="-26" :cy="LANE_H - CELL / 2 - 6" r="20" fill="#ffffff" fill-opacity="0.12" stroke="#ffffff" stroke-opacity="0.45" stroke-dasharray="5 5" />
    </g>

    <!-- characters, drawn last so they stay on top -->
    <g class="token" :style="{ transform: `translate(${cx(player) - 38}px, ${LANE_H - CELL - 56}px)` }">
      <svg width="76" height="64" class="overflow-visible"><CharacterSprite :id="character" /></svg>
    </g>
    <g class="token" :style="{ transform: `translate(${cx(crab) - 32}px, ${LANE_H + GAP + LANE_H - CELL - 48}px)` }">
      <svg width="64" height="54" class="overflow-visible"><CrabSprite :walking="crabWalking" /></svg>
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
.coin-count {
  font-weight: 800;
  font-size: 17px;
  fill: #6b4500;
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
