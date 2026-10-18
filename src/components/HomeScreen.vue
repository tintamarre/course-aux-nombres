<script setup lang="ts">
import { computed, ref } from 'vue'
import { CHARACTERS } from '../data/characters'
import { saveProfile, useProfiles } from '../composables/useProfiles'
import CharacterSprite from './CharacterSprite.vue'
import CrabSprite from './CrabSprite.vue'
import AquariumView from './AquariumView.vue'

const emit = defineEmits<{ play: []; adult: [] }>()
const { profiles, current, select } = useProfiles()

const available = computed(() => CHARACTERS.filter((c) => (current.value?.fish ?? 0) >= c.unlockAt))
function pickCharacter(id: (typeof CHARACTERS)[number]['id']) {
  if (!current.value) return
  current.value.character = id
  saveProfile(current.value)
}

/* the adult space opens with a long press, so that children do not land there by accident */
const holding = ref(false)
let holdTimer: ReturnType<typeof setTimeout> | undefined
function startHold() {
  holding.value = true
  holdTimer = setTimeout(() => {
    holding.value = false
    emit('adult')
  }, 1200)
}
function stopHold() {
  holding.value = false
  clearTimeout(holdTimer)
}
</script>

<template>
  <div class="relative flex h-full flex-col items-center overflow-y-auto px-4 py-6">
    <header class="flex items-end gap-4">
      <CharacterSprite :id="current?.character ?? 'dauphin'" mood="happy" class="bob h-24 w-28" />
      <h1 class="title text-center text-5xl leading-none text-white drop-shadow md:text-7xl">
        La Course<br /><span class="text-[#f8c73c]">aux nombres</span>
      </h1>
      <CrabSprite class="h-20 w-24" />
    </header>

    <!-- profile choice -->
    <div v-if="profiles.length > 1" class="mt-6 flex flex-wrap justify-center gap-3">
      <button
        v-for="p in profiles"
        :key="p.id"
        type="button"
        class="flex items-center gap-2 rounded-full px-4 py-2 text-lg font-bold transition"
        :class="current?.id === p.id ? 'bg-white text-[#0b3954]' : 'bg-white/15 text-white hover:bg-white/25'"
        @click="select(p.id)"
      >
        <CharacterSprite :id="p.character" class="h-8 w-10" />{{ p.name }}
      </button>
    </div>

    <template v-if="current">
      <button type="button" class="btn btn-primary mt-8 text-3xl" @click="emit('play')">Jouer</button>

      <div v-if="available.length > 1" class="mt-8 flex flex-wrap justify-center gap-2">
        <button
          v-for="c in available"
          :key="c.id"
          type="button"
          class="rounded-2xl p-2 transition"
          :class="current.character === c.id ? 'bg-white/30 ring-4 ring-white' : 'bg-white/10 hover:bg-white/20'"
          :aria-label="c.name"
          @click="pickCharacter(c.id)"
        >
          <CharacterSprite :id="c.id" class="h-16 w-20" />
        </button>
      </div>

      <AquariumView :count="current.fish" class="mt-8 h-48 w-full max-w-2xl" />
    </template>

    <div v-else class="mt-10 max-w-md rounded-3xl bg-white/15 p-6 text-center text-white">
      <p class="text-xl">Bienvenue ! Un adulte doit d'abord créer un profil.</p>
      <button type="button" class="btn btn-primary mt-4" @click="emit('adult')">Créer un profil</button>
    </div>

    <!-- adult space: long press -->
    <button
      type="button"
      class="absolute right-4 bottom-4 flex items-center gap-2 rounded-full bg-black/20 px-3 py-2 text-sm text-white/70 select-none"
      aria-label="Espace adulte (maintenir appuyé)"
      @pointerdown="startHold"
      @pointerup="stopHold"
      @pointerleave="stopHold"
      @contextmenu.prevent
    >
      <span class="relative h-6 w-6">
        <svg viewBox="0 0 24 24" class="h-6 w-6">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-opacity="0.3" stroke-width="2.5" fill="none" />
          <circle
            cx="12" cy="12" r="10" stroke="#f8c73c" stroke-width="2.5" fill="none" stroke-dasharray="63" :stroke-dashoffset="holding ? 0 : 63"
            :style="{ transition: holding ? 'stroke-dashoffset 1.2s linear' : 'none' }" transform="rotate(-90 12 12)"
          />
          <circle cx="12" cy="9" r="3" fill="currentColor" /><path d="M6.5 17.5c1-3 3-4 5.5-4s4.5 1 5.5 4" fill="currentColor" />
        </svg>
      </span>
      Espace adulte
    </button>
  </div>
</template>
