<script setup lang="ts">
/**
 * Session timer: a thin line along the top of the screen that fills up over the suggested
 * session length. No digits on purpose, so that it does not compete with the numbers of the task.
 * Updated every few seconds only.
 */
import { computed, onBeforeUnmount, ref } from 'vue'

const props = defineProps<{ start: number; minutes: number }>()

const now = ref(Date.now())
const timer = setInterval(() => (now.value = Date.now()), 5000)
onBeforeUnmount(() => clearInterval(timer))

const elapsedMin = computed(() => (now.value - props.start) / 60000)
const fraction = computed(() => Math.min(1, elapsedMin.value / props.minutes))
const ending = computed(() => props.minutes - elapsedMin.value <= 2)
</script>

<template>
  <div
    v-if="minutes > 0"
    class="pointer-events-none h-1.5 overflow-hidden bg-white/15"
    role="progressbar"
    aria-label="temps de la séance"
    :aria-valuenow="Math.round(fraction * 100)"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div
      class="h-full rounded-r-full transition-[width] duration-[5000ms] ease-linear"
      :class="ending ? 'bg-[#f8c73c]' : 'bg-white/60'"
      :style="{ width: `${fraction * 100}%` }"
    />
  </div>
</template>
