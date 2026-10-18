<script setup lang="ts">
/** Rolling success rate (last 20 trials) and complexity level across all trials. */
import { computed } from 'vue'
import type { TrialLog } from '../composables/useProfiles'

const props = defineProps<{ trials: TrialLog[] }>()
const W = 600
const H = 200
const PAD = 28

const points = computed(() => {
  const t = props.trials
  return t.map((_, k) => {
    const win = t.slice(Math.max(0, k - 19), k + 1)
    return { rate: win.filter((x) => x.correct).length / win.length, level: t[k].level }
  })
})
const x = (k: number) => PAD + (k / Math.max(1, points.value.length - 1)) * (W - 2 * PAD)
const yRate = (r: number) => H - PAD - r * (H - 2 * PAD)
const yLevel = (l: number) => H - PAD - ((l - 1) / 13) * (H - 2 * PAD)
const ratePath = computed(() => points.value.map((p, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)} ${yRate(p.rate).toFixed(1)}`).join(' '))
const levelPath = computed(() => points.value.map((p, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)} ${yLevel(p.level).toFixed(1)}`).join(' '))
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${H}`" class="w-full">
    <line :x1="PAD" :x2="W - PAD" :y1="yRate(0.75)" :y2="yRate(0.75)" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4" />
    <text :x="W - PAD" :y="yRate(0.75) - 4" text-anchor="end" class="fill-current text-[10px] opacity-60">cible 75 %</text>
    <line :x1="PAD" :x2="W - PAD" :y1="H - PAD" :y2="H - PAD" stroke="currentColor" stroke-opacity="0.3" />
    <path :d="levelPath" stroke="#c98a1b" stroke-width="2" fill="none" />
    <path :d="ratePath" stroke="#087e8b" stroke-width="2.5" fill="none" />
    <text :x="PAD" :y="14" class="fill-[#087e8b] text-[11px] font-bold">réussite (20 derniers essais)</text>
    <text :x="W / 2" :y="14" class="fill-[#c98a1b] text-[11px] font-bold">niveau de complexité (1–14)</text>
    <text :x="W / 2" :y="H - 8" text-anchor="middle" class="fill-current text-[10px] opacity-60">essais ({{ trials.length }})</text>
  </svg>
</template>
