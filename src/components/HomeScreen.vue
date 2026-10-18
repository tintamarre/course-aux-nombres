<script setup lang="ts">
import { computed, ref } from 'vue'
import { CHARACTERS } from '../data/characters'
import { saveProfile, useProfiles } from '../composables/useProfiles'
import CharacterSprite from './CharacterSprite.vue'
import CrabSprite from './CrabSprite.vue'
import AquariumView from './AquariumView.vue'

const emit = defineEmits<{ play: []; adult: [] }>()
const { profiles, current, select, create } = useProfiles()

/* creating a player happens right here, in two steps: type a name, touch « C'est parti ! » */
const adding = ref(false)
const newName = ref('')
const showForm = computed(() => adding.value || profiles.value.length === 0)
function addPlayer() {
  if (!newName.value.trim()) return
  create(newName.value, 'modere')
  newName.value = ''
  adding.value = false
}

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

    <!-- player choice -->
    <div v-if="profiles.length && !showForm" class="mt-[3vh] flex flex-wrap justify-center gap-3">
      <button
        v-for="p in profiles"
        :key="p.id"
        type="button"
        class="flex h-14 items-center gap-2 rounded-full px-5 text-xl font-bold transition"
        :class="current?.id === p.id ? 'bg-white text-[#0b3954]' : 'bg-white/15 text-white active:bg-white/25'"
        @click="select(p.id)"
      >
        <CharacterSprite :id="p.character" class="h-9 w-11" />{{ p.name }}
      </button>
      <button type="button" class="flex h-14 items-center gap-2 rounded-full bg-white/15 px-5 text-xl font-bold text-white active:bg-white/25" @click="adding = true">
        <span class="text-2xl leading-none">+</span> Nouveau joueur
      </button>
    </div>

    <!-- new player -->
    <form v-if="showForm" class="mt-[4vh] flex w-full max-w-xl flex-col items-center gap-4 rounded-3xl bg-white/15 p-6 text-white" @submit.prevent="addPlayer">
      <label for="player-name" class="text-3xl font-bold">Comment t'appelles-tu ?</label>
      <input
        id="player-name"
        v-model="newName"
        class="h-16 w-full rounded-2xl bg-white px-5 text-center text-3xl font-bold text-[#0b3954] outline-none focus:ring-4 focus:ring-[#f8c73c]"
        placeholder="Ton prénom"
        maxlength="20"
        autocomplete="off"
        autocapitalize="words"
        enterkeyhint="go"
      />
      <div class="flex flex-wrap justify-center gap-3">
        <button v-if="profiles.length" type="button" class="btn" @click="adding = false; newName = ''">Annuler</button>
        <button type="submit" class="btn btn-primary" :disabled="!newName.trim()" :class="{ 'opacity-50': !newName.trim() }">C'est parti !</button>
      </div>
    </form>

    <template v-if="current && !showForm">
      <button type="button" class="btn btn-primary mt-[4vh] text-3xl" @click="emit('play')">Jouer</button>

      <div v-if="available.length > 1" class="mt-8 flex flex-wrap justify-center gap-2">
        <button
          v-for="c in available"
          :key="c.id"
          type="button"
          class="rounded-2xl p-2 transition"
          :class="current.character === c.id ? 'bg-white/30 ring-4 ring-white' : 'bg-white/10 active:bg-white/20'"
          :aria-label="c.name"
          @click="pickCharacter(c.id)"
        >
          <CharacterSprite :id="c.id" class="h-16 w-20" />
        </button>
      </div>

      <AquariumView :count="current.fish" class="mt-8 h-48 w-full max-w-2xl" />
    </template>


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
