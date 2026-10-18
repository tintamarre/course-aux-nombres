<script setup lang="ts">
defineProps<{ color: string }>()
</script>

<template>
  <svg viewBox="0 0 60 36">
    <path d="M10 18 L0 6 L2 18 L0 30 Z" :fill="color" />
    <ellipse cx="32" cy="18" rx="24" ry="14" :fill="color" />
    <path d="M26 6 Q32 0 40 6" :fill="color" />
    <path d="M24 10 Q30 18 24 26" stroke="#fff" stroke-opacity="0.5" stroke-width="3" fill="none" />
    <circle cx="46" cy="15" r="3" fill="#12263a" />
  </svg>
</template>
