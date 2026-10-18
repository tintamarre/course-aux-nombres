<script setup lang="ts">
/**
 * Session timer in a corner: a ring that fills up over the suggested session length, with the
 * minutes left. Updated every few seconds only, and no ticking seconds, to stay out of the way.
 */
import { computed, onBeforeUnmount, ref } from 'vue'

const props = defineProps<{ start: number; minutes: number }>()

const now = ref(Date.now())
const timer = setInterval(() => (now.value = Date.now()), 5000)
onBeforeUnmount(() => clearInterval(timer))

const elapsedMin = computed(() => (now.value - props.start) / 60000)
const fraction = computed(() => (props.minutes > 0 ? Math.min(1, elapsedMin.value / props.minutes) : 0))
const label = computed(() =>
  props.minutes > 0 ? `${Math.max(0, Math.ceil(props.minutes - elapsedMin.value))} min` : `${Math.floor(elapsedMin.value)} min`,
)
const ending = computed(() => props.minutes > 0 && props.minutes - elapsedMin.value <= 2)
const R = 16
const C = 2 * Math.PI * R
</script>

<template>
  <div
    class="flex h-12 items-center gap-2 rounded-full bg-white/10 py-1 pr-4 pl-1 text-white/75"
    :title="minutes > 0 ? `Séance de ${minutes} minutes` : 'Temps de jeu'"
    role="timer"
    :aria-label="minutes > 0 ? `${label} restantes` : `${label} de jeu`"
  >
    <svg viewBox="0 0 40 40" class="h-10 w-10 -rotate-90">
      <circle cx="20" cy="20" :r="R" fill="none" stroke="currentColor" stroke-opacity="0.25" stroke-width="5" />
      <circle
        v-if="minutes > 0"
        cx="20"
        cy="20"
        :r="R"
        fill="none"
        :stroke="ending ? '#f8c73c' : '#ffffff'"
        stroke-width="5"
        stroke-linecap="round"
        :stroke-dasharray="C"
        :stroke-dashoffset="C * (1 - fraction)"
        class="transition-[stroke-dashoffset] duration-1000"
      />
    </svg>
    <span class="text-lg font-bold tabular-nums" :class="{ 'text-[#f8c73c]': ending }">{{ label }}</span>
  </div>
</template>
