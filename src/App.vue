<script setup lang="ts">
import { ref } from 'vue'
import { useProfiles } from './composables/useProfiles'
import { hush } from './composables/useSpeech'
import { unlockAudio } from './composables/useSounds'
import CharacterSprite from './components/CharacterSprite.vue'
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
  <!-- the first touch anywhere (pointerup/touchend are user activations, pointerdown is not) unlocks sound and speech (required on iPad / iOS) -->
  <div class="sea h-dvh w-full overflow-hidden" @pointerup.capture="unlockAudio" @touchend.capture="unlockAudio">
    <PlayScreen v-if="screen === 'play' && current" :key="current.id" :profile="current" @exit="go('home')" />
    <AdultScreen v-else-if="screen === 'adult'" @close="go('home')" />
    <HomeScreen v-else @play="go('play')" @adult="go('adult')" />

    <!-- the game is designed for a tablet held in landscape -->
    <div v-if="screen === 'play'" class="rotate-hint fixed inset-0 z-50 flex-col items-center justify-center gap-6 p-8 text-center text-white">
      <CharacterSprite id="dauphin" class="rotate-anim h-32 w-40" />
      <p class="text-3xl font-bold">Tourne la tablette pour jouer</p>
    </div>
  </div>
</template>
