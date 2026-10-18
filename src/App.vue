<script setup lang="ts">
import { ref } from 'vue'
import { useProfiles } from './composables/useProfiles'
import { hush } from './composables/useSpeech'
import HomeScreen from './components/HomeScreen.vue'
import PlayScreen from './components/PlayScreen.vue'
import AdultScreen from './components/AdultScreen.vue'

const { current } = useProfiles()
const screen = ref<'home' | 'play' | 'adult'>('home')

function go(s: typeof screen.value) {
  hush()
  screen.value = s
}
</script>

<template>
  <div class="sea h-dvh w-full overflow-hidden">
    <PlayScreen v-if="screen === 'play' && current" :key="current.id" :profile="current" @exit="go('home')" />
    <AdultScreen v-else-if="screen === 'adult'" @close="go('home')" />
    <HomeScreen v-else @play="go('play')" @adult="go('adult')" />
  </div>
</template>
