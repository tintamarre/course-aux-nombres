<script setup lang="ts">
/**
 * Gold pieces arranged in rows of five (like a ten-frame), used for the feedback after the choice
 * and to concretise additions (pieces join) and subtractions (pieces go away).
 */
import { computed } from 'vue'
import CoinIcon from './CoinIcon.vue'

const props = withDefaults(defineProps<{ count: number; added?: number; removed?: number }>(), { added: 0, removed: 0 })

const R = 14
const STEP = 34
const total = computed(() => props.count + props.added)
const coins = computed(() =>
  Array.from({ length: total.value }, (_, k) => ({
    x: R + 2 + (k % 5) * STEP,
    y: R + 2 + Math.floor(k / 5) * STEP,
    added: k >= props.count,
    removed: k >= total.value - props.removed,
  })),
)
</script>

<template>
  <svg :viewBox="`0 0 ${4 * STEP + 2 * R + 4} ${STEP + 2 * R + 4}`" class="w-full max-w-[200px]">
    <g v-for="(c, k) in coins" :key="k" :class="{ 'coin-in': c.added, 'coin-out': c.removed }" :style="{ transformOrigin: `${c.x}px ${c.y}px` }">
      <CoinIcon :x="c.x" :y="c.y" :r="R" />
    </g>
  </svg>
</template>

<style scoped>
.coin-in {
  animation: coin-in 0.5s ease-out both;
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
