<script setup lang="ts">
defineProps<{ mood?: 'happy' | 'sad' | 'neutral'; walking?: boolean }>()
</script>

<template>
  <svg viewBox="0 0 120 100" class="overflow-visible">
    <g :class="{ 'crab-walk': walking }">
      <g stroke="#c2412b" stroke-width="5" stroke-linecap="round" fill="none">
        <path d="M34 66 L18 78 L14 90" /><path d="M40 72 L28 86 L26 96" />
        <path d="M86 66 L102 78 L106 90" /><path d="M80 72 L92 86 L94 96" />
        <path d="M32 54 Q18 46 18 34" /><path d="M88 54 Q102 46 102 34" />
      </g>
      <path d="M8 30 Q8 14 22 16 L18 28 L28 26 Q28 40 14 40 Q8 38 8 30 Z" fill="#e4572e" />
      <path d="M112 30 Q112 14 98 16 L102 28 L92 26 Q92 40 106 40 Q112 38 112 30 Z" fill="#e4572e" />
      <ellipse cx="60" cy="62" rx="32" ry="20" fill="#e4572e" />
      <ellipse cx="60" cy="68" rx="20" ry="8" fill="#f28c6b" />
      <path d="M50 44 V34 M70 44 V34" stroke="#e4572e" stroke-width="4" />
      <circle cx="50" cy="31" r="6" fill="#fff" /><circle cx="51" cy="31" r="3.2" fill="#12263a" />
      <circle cx="70" cy="31" r="6" fill="#fff" /><circle cx="71" cy="31" r="3.2" fill="#12263a" />
      <path
        :d="mood === 'sad' ? 'M52 64 q8 -6 16 0' : mood === 'neutral' ? 'M52 62 h16' : 'M52 60 q8 6 16 0'"
        stroke="#7a1f10" stroke-width="2.6" fill="none" stroke-linecap="round"
      />
    </g>
  </svg>
</template>

<style scoped>
.crab-walk {
  animation: crab-walk 0.35s ease-in-out infinite alternate;
  transform-origin: 60px 70px;
}
@keyframes crab-walk {
  from { transform: rotate(-4deg); }
  to { transform: rotate(4deg); }
}
</style>
