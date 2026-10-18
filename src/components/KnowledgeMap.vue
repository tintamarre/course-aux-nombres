<script setup lang="ts">
/** Heat map of a 2-D projection of the knowledge matrix K (mean over the third dimension). */
import { computed } from 'vue'

const props = defineProps<{ grid: number[][]; xLabel: string; yLabel: string }>()
const m = computed(() => props.grid.length)

/** sequential palette, light (low success) to dark teal (high success) */
function color(v: number): string {
  const t = Math.max(0, Math.min(1, v))
  const from = [246, 239, 226]
  const to = [8, 94, 110]
  return `rgb(${from.map((f, i) => Math.round(f + (to[i] - f) * t)).join(',')})`
}
</script>

<template>
  <figure class="flex flex-col items-center">
    <svg :viewBox="`-14 0 ${m * 10 + 16} ${m * 10 + 14}`" class="w-full max-w-[240px]">
      <!-- grid[a][b]: a on the x axis, b on the y axis (difficulty increases upward) -->
      <template v-for="(row, a) in grid" :key="a">
        <rect v-for="(v, b) in row" :key="b" :x="a * 10" :y="(m - 1 - b) * 10" width="10.4" height="10.4" :fill="color(v)" shape-rendering="crispEdges">
          <title>{{ Math.round(v * 100) }} %</title>
        </rect>
      </template>
      <text :x="(m * 10) / 2" :y="m * 10 + 11" text-anchor="middle" class="fill-current text-[8px]">{{ xLabel }} →</text>
      <text :x="-5" :y="(m * 10) / 2" text-anchor="middle" class="fill-current text-[8px]" :transform="`rotate(-90 -5 ${(m * 10) / 2})`">
        {{ yLabel }} →
      </text>
    </svg>
  </figure>
</template>
