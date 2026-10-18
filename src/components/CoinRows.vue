<script setup lang="ts">
/**
 * Gold pieces arranged in rows of five (like a ten-frame), used for the feedback after the choice
 * and to concretise additions (pieces join) and subtractions (pieces go away).
 */
import { computed } from 'vue'
import CoinIcon from './CoinIcon.vue'

const props = withDefaults(defineProps<{ count: number; added?: number; removed?: number; waiting?: boolean }>(), {
  added: 0,
  removed: 0,
  waiting: false,
})

const R = 14
const STEP = 34
const total = computed(() => props.count + props.added)
const coins = computed(() =>
  Array.from({ length: total.value }, (_, k) => ({
    // each row is centred, so the pieces stay balanced as they leave
    x: R + 2 + (k % 5) * STEP + ((5 - Math.min(5, total.value - Math.floor(k / 5) * 5)) * STEP) / 2,
    y: R + 2 + Math.floor(k / 5) * STEP,
    added: k >= props.count,
    removed: k >= total.value - props.removed,
  })),
)
</script>

<template>
  <svg :viewBox="`0 0 ${4 * STEP + 2 * R + 4} ${STEP + 2 * R + 4}`" class="coin-rows h-full w-auto max-w-[260px]">
    <g
      v-for="(c, k) in coins"
      :key="k"
      :class="{ 'coin-in': c.added, 'coin-out': c.removed, 'coin-wait': waiting && k === coins.length - 1 }"
      :style="{ transformOrigin: `${c.x}px ${c.y}px` }"
    >
      <CoinIcon :x="c.x" :y="c.y" :r="R" />
    </g>
  </svg>
</template>

<style scoped>
.coin-in {
  animation: coin-in 0.5s ease-out both;
}
.coin-wait {
  animation: coin-wait 1.2s ease-in-out infinite;
}
@keyframes coin-wait {
  50% { transform: translateY(-6px); }
}
.coin-out {
  animation: coin-out 0.7s ease-in 0.3s both;
}
@keyframes coin-in {
  from { transform: translateY(-30px) scale(0.4); opacity: 0; }
}
@keyframes coin-out {
  to { transform: translateY(-24px) scale(0.6); opacity: 0.15; }
}
</style>
