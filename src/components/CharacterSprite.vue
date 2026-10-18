<script setup lang="ts">
import { computed } from 'vue'
import { characterById } from '../data/characters'

const props = defineProps<{ id: string; mood?: 'happy' | 'sad' | 'neutral' }>()
const c = computed(() => characterById(props.id))
const mouth = computed(() =>
  props.mood === 'sad' ? 'M0 3 q4 -4 8 0' : props.mood === 'neutral' ? 'M0 1 h8' : 'M0 0 q4 4 8 0',
)
</script>

<template>
  <!-- All characters face right, drawn in a 120 × 100 box -->
  <svg viewBox="0 0 120 100" class="overflow-visible">
    <g v-if="c.id === 'dauphin'">
      <path d="M22 60 Q12 52 3 46 Q9 56 8 61 Q9 66 3 76 Q13 69 22 63 Z" :fill="c.body" />
      <path d="M50 38 Q52 26 42 15 Q62 20 68 37 Z" :fill="c.body" />
      <path d="M18 61 C30 44 54 34 76 34 C94 34 104 40 104 49 C109 50 115 52 118 55 Q120 58 116 60 L102 61 C92 71 62 76 40 72 C30 70 22 66 18 61 Z" :fill="c.body" />
      <path d="M40 72 C62 76 92 71 102 61 L115 60 Q102 63 90 64 C72 66 54 66 40 72 Z" :fill="c.belly" />
      <path d="M60 66 Q56 77 48 82 Q60 80 68 68 Z" :fill="c.body" />
      <circle cx="90" cy="46" r="3.6" fill="#12263a" /><circle cx="91.2" cy="44.8" r="1.2" fill="#fff" />
      <path :d="mouth" transform="translate(104 56) scale(1.3 0.7)" stroke="#12263a" stroke-width="1.8" fill="none" stroke-linecap="round" />
    </g>

    <g v-else-if="c.id === 'tortue'">
      <ellipse cx="34" cy="76" rx="12" ry="6" :fill="c.body" transform="rotate(25 34 76)" />
      <ellipse cx="80" cy="78" rx="12" ry="6" :fill="c.body" transform="rotate(-25 80 78)" />
      <ellipse cx="22" cy="62" rx="8" ry="4" :fill="c.body" />
      <circle cx="98" cy="52" r="13" :fill="c.body" />
      <ellipse cx="58" cy="58" rx="40" ry="26" :fill="c.belly" />
      <path d="M22 60 Q24 30 58 30 Q92 30 94 60 Z" fill="#3c8f53" />
      <path d="M42 36 L58 44 L74 36 M40 58 L58 44 L76 58 M58 44 V30" stroke="#2c6b3d" stroke-width="2.5" fill="none" />
      <circle cx="103" cy="48" r="3.5" fill="#12263a" /><circle cx="104" cy="47" r="1.1" fill="#fff" />
      <path :d="mouth" transform="translate(100 56) scale(0.8)" stroke="#12263a" stroke-width="2.4" fill="none" stroke-linecap="round" />
    </g>

    <g v-else-if="c.id === 'poulpe'">
      <g :stroke="c.body" stroke-width="9" stroke-linecap="round" fill="none">
        <path d="M40 62 Q30 80 18 84" />
        <path d="M52 66 Q48 86 38 94" />
        <path d="M66 66 Q72 86 84 92" />
        <path d="M78 62 Q92 76 104 78" />
      </g>
      <path d="M30 64 Q26 18 60 16 Q94 18 90 64 Q60 74 30 64 Z" :fill="c.body" />
      <ellipse cx="60" cy="58" rx="22" ry="6" :fill="c.belly" opacity="0.6" />
      <circle cx="50" cy="44" r="6" fill="#fff" /><circle cx="51" cy="45" r="3.4" fill="#12263a" />
      <circle cx="72" cy="44" r="6" fill="#fff" /><circle cx="73" cy="45" r="3.4" fill="#12263a" />
      <path :d="mouth" transform="translate(56 54)" stroke="#12263a" stroke-width="2.2" fill="none" stroke-linecap="round" />
    </g>

    <g v-else-if="c.id === 'hippocampe'">
      <path d="M56 22 Q80 16 84 34 Q86 46 72 52 Q84 62 74 78 Q66 92 52 88 Q42 84 48 76 Q54 70 60 76" :stroke="c.body" stroke-width="16" stroke-linecap="round" fill="none" />
      <path d="M78 26 L104 30 L104 38 L80 38 Z" :fill="c.body" />
      <path d="M52 40 Q40 46 44 58 Q52 52 58 50 Z" :fill="c.belly" />
      <path d="M58 16 L62 6 L66 18 L72 8 L74 20" :fill="c.body" />
      <circle cx="72" cy="28" r="4" fill="#12263a" /><circle cx="73.3" cy="26.8" r="1.3" fill="#fff" />
    </g>

    <g v-else-if="c.id === 'baleine'">
      <path d="M14 46 L0 30 L4 50 L0 66 L16 56 Z" :fill="c.body" />
      <path d="M12 52 Q20 22 70 22 Q114 22 114 56 Q114 80 72 82 Q28 84 12 52 Z" :fill="c.body" />
      <path d="M40 74 Q70 88 110 66 Q100 64 60 66 Q46 68 40 74 Z" :fill="c.belly" />
      <path d="M50 70 Q60 72 70 70 M54 76 Q66 78 80 75" stroke="#9fb1d6" stroke-width="2" fill="none" />
      <circle cx="94" cy="48" r="4.5" fill="#fff" /><circle cx="95" cy="48.5" r="2.8" fill="#12263a" />
      <path :d="mouth" transform="translate(98 60) scale(1.1)" stroke="#12263a" stroke-width="2" fill="none" stroke-linecap="round" />
    </g>

    <g v-else>
      <path d="M8 62 Q30 60 44 58" :stroke="c.body" stroke-width="3" stroke-linecap="round" fill="none" />
      <path d="M40 56 Q62 14 80 30 Q92 40 112 56 Q92 72 80 82 Q62 98 40 56 Z" :fill="c.body" />
      <path d="M60 56 Q72 70 92 62" stroke="#1d8278" stroke-width="2" fill="none" />
      <circle cx="84" cy="46" r="4" fill="#12263a" /><circle cx="85.2" cy="44.8" r="1.2" fill="#fff" />
      <circle cx="92" cy="50" r="3" fill="#12263a" />
      <path :d="mouth" transform="translate(94 58) scale(0.8)" stroke="#12263a" stroke-width="2.4" fill="none" stroke-linecap="round" />
    </g>
  </svg>
</template>
