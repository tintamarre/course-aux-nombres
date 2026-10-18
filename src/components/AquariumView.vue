<script setup lang="ts">
/** The collection of reward fish won by the child. */
import { computed } from 'vue'
import { FISH_COLORS } from '../data/characters'
import { mulberry32 } from '../engine/rng'
import FishSprite from './FishSprite.vue'

const props = withDefaults(defineProps<{ count: number; highlightLast?: boolean }>(), { highlightLast: false })

const fish = computed(() => {
  const rng = mulberry32(7)
  return Array.from({ length: props.count }, (_, k) => ({
    color: FISH_COLORS[k % FISH_COLORS.length],
    left: 4 + rng() * 84,
    top: 8 + rng() * 70,
    size: 34 + rng() * 22,
    delay: rng() * 4,
    flip: rng() < 0.5,
  }))
})
</script>

<template>
  <div class="relative overflow-hidden rounded-3xl border-4 border-white/30 bg-gradient-to-b from-[#7fd3e8]/40 to-[#1e6f8c]/40">
    <div class="absolute inset-x-0 bottom-0 h-6 bg-[#ecd08f]/70" />
    <div
      v-for="(f, k) in fish"
      :key="k"
      class="swim absolute"
      :class="{ 'new-fish': highlightLast && k === fish.length - 1 }"
      :style="{ left: `${f.left}%`, top: `${f.top}%`, width: `${f.size}px`, animationDelay: `${f.delay}s` }"
    >
      <FishSprite :color="f.color" :style="{ transform: f.flip ? 'scaleX(-1)' : undefined }" />
    </div>
    <p v-if="count === 0" class="absolute inset-0 flex items-center justify-center p-4 text-center text-lg text-white/80">
      Gagne des courses pour remplir ton aquarium !
    </p>
  </div>
</template>

<style scoped>
.swim {
  animation: swim 6s ease-in-out infinite alternate;
}
@keyframes swim {
  from { transform: translate(0, 0); }
  to { transform: translate(14px, -6px); }
}
.new-fish {
  animation: arrive 1.6s cubic-bezier(0.2, 0.8, 0.3, 1) both;
}
@keyframes arrive {
  from { transform: translate(-60vw, 10vh) scale(2.5); }
}
</style>
