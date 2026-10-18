<script setup lang="ts">
withDefaults(defineProps<{ x?: number; y?: number; r?: number; muted?: boolean }>(), { x: 0, y: 0, r: 10, muted: false })
</script>

<template>
  <g :opacity="muted ? 0.25 : 1">
    <circle :cx="x" :cy="y" :r="r" fill="#e9a91f" />
    <circle :cx="x" :cy="y" :r="r * 0.78" fill="#f8c73c" />
    <ellipse :cx="x - r * 0.28" :cy="y - r * 0.3" :rx="r * 0.28" :ry="r * 0.16" fill="#fff3c4" opacity="0.8" />
  </g>
</template>
