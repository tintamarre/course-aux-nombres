<script setup lang="ts">
/** One play session: turns (choice + move on the track) until the suggested time is over. */
import { computed, onBeforeUnmount, ref } from 'vue'
import { generateProblem, type Problem, type Side } from '../engine/problem'
import { placeHazards } from '../engine/board'
import { CHARACTERS, type Character } from '../data/characters'
import { knowledgeOf, saveProfile, storeKnowledge, type Profile, type SessionLog } from '../composables/useProfiles'
import { useSettings } from '../composables/useSettings'
import { say } from '../composables/useSpeech'
import { sounds } from '../composables/useSounds'
import TurnScreen from './TurnScreen.vue'
import type { Lane } from './TrackView.vue'
import AquariumView from './AquariumView.vue'
import CharacterSprite from './CharacterSprite.vue'
import CrabSprite from './CrabSprite.vue'

const props = defineProps<{ profile: Profile }>()
const emit = defineEmits<{ exit: [] }>()

const settings = useSettings()
const ks = knowledgeOf(props.profile)
const rng = Math.random

/** dev only: ?d=speed,distance,complexity forces the difficulty, to preview a level */
const forced = import.meta.env.DEV ? new URLSearchParams(location.search).get('d')?.split(',').map(Number) : undefined
const selectDifficulty = () => (forced?.length === 3 ? forced : ks.select(rng))

type Phase = 'turn' | 'reward' | 'crabWon' | 'sessionEnd'
const phase = ref<Phase>('turn')
const round = ref(0)
const unlocked = ref<Character | null>(null)

function newTurn(): { problem: Problem; hazards: Record<Lane, number[]> } {
  const problem = generateProblem(selectDifficulty(), rng)
  const { race } = props.profile
  return {
    problem,
    hazards: problem.level.hazards
      ? { player: placeHazards(rng, [race.player]), crab: placeHazards(rng, [race.crab]) }
      : { player: [], crab: [] },
  }
}
const turn = ref(newTurn())

const session: SessionLog = { start: Date.now(), end: Date.now(), trials: 0, correct: 0 }
props.profile.sessions.push(session)
const fishAtStart = props.profile.fish

function saveAll() {
  session.end = Date.now()
  storeKnowledge(props.profile, ks)
  saveProfile(props.profile)
}
onBeforeUnmount(saveAll)

const label = (s: Side) => {
  const q = turn.value.problem[s]
  return q.operation ? `${q.operation.a}${q.operation.op}${q.operation.b}` : String(q.value)
}

/** The child's answer updates the adaptive algorithm right away. */
function onChoice(choice: Side | null, rt: number) {
  const p = turn.value.problem
  const correct = choice === p.larger
  ks.update(p.difficulty, correct)
  props.profile.trials.push({
    t: Date.now(),
    d: p.difficulty.map((x) => Math.round(x * 1000) / 1000) as [number, number, number],
    level: p.level.level,
    left: label('left'),
    right: label('right'),
    larger: p.larger,
    choice,
    correct,
    rt,
    deadline: p.deadline === null ? null : Math.round(p.deadline * 100) / 100,
  })
  session.trials++
  if (correct) session.correct++
  saveAll()
}

async function onTurnDone(player: number, crab: number, winner: Lane | null) {
  const { profile } = props
  profile.race = winner ? { player: 0, crab: 0 } : { player, crab }
  if (winner === 'player') {
    profile.fish++
    unlocked.value = CHARACTERS.find((c) => c.unlockAt === profile.fish) ?? null
    saveAll()
    phase.value = 'reward'
    sounds.reward()
    await say('Bravo ! Tu as gagné la course ! Voici un poisson pour ton aquarium.')
    if (unlocked.value) await say(`Tu peux maintenant jouer avec ${unlocked.value.article} !`)
    return
  }
  saveAll()
  if (winner === 'crab') {
    phase.value = 'crabWon'
    await say('Le crabe a gagné cette course. On recommence !')
    return
  }
  next()
}

function next() {
  const elapsed = (Date.now() - session.start) / 60000
  if (settings.sessionMinutes > 0 && elapsed >= settings.sessionMinutes) {
    phase.value = 'sessionEnd'
    void say("Bravo ! C'est fini pour aujourd'hui. À bientôt !")
    return
  }
  turn.value = newTurn()
  round.value++
  phase.value = 'turn'
}

function playWith(c: Character) {
  props.profile.character = c.id
  unlocked.value = null
  saveAll()
}

const fishWon = computed(() => props.profile.fish - fishAtStart)
</script>

<template>
  <div class="relative h-full">
    <button
      type="button"
      class="absolute top-[1vh] left-3 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white/60 active:bg-white/25"
      aria-label="Retour à l'accueil"
      @click="emit('exit')"
    >
      <svg viewBox="0 0 24 24" class="h-6 w-6"><path d="M3 11l9-8 9 8v10h-6v-6H9v6H3z" fill="currentColor" /></svg>
    </button>

    <TurnScreen
      v-if="phase === 'turn'"
      :key="round"
      :problem="turn.problem"
      :hazards="turn.hazards"
      :character="profile.character"
      :player="profile.race.player"
      :crab="profile.race.crab"
      @choice="onChoice"
      @done="onTurnDone"
    />

    <div v-else-if="phase === 'reward'" class="flex h-full flex-col items-center justify-center gap-[3vh] p-6">
      <h2 class="title text-[8vh] leading-none text-white">Bravo !</h2>
      <AquariumView :count="profile.fish" highlight-last class="h-[38vh] w-full max-w-3xl" />
      <div v-if="unlocked" class="flex items-center gap-4 rounded-3xl bg-white/15 p-4 text-white">
        <CharacterSprite :id="unlocked.id" mood="happy" class="h-24 w-28" />
        <div>
          <p class="text-2xl font-bold">Nouveau : {{ unlocked.article }} !</p>
          <button type="button" class="btn mt-2" @click="playWith(unlocked)">Jouer avec {{ unlocked.article }}</button>
        </div>
      </div>
      <button type="button" class="btn btn-primary" @click="next">Continuer</button>
    </div>

    <div v-else-if="phase === 'crabWon'" class="flex h-full flex-col items-center justify-center gap-6 p-6 text-white">
      <CrabSprite mood="happy" class="h-40 w-48" />
      <p class="text-3xl font-bold">Le crabe a gagné cette course.</p>
      <button type="button" class="btn btn-primary" @click="next">On recommence !</button>
    </div>

    <div v-else class="flex h-full flex-col items-center justify-center gap-6 p-6 text-white">
      <CharacterSprite :id="profile.character" mood="happy" class="bob h-40 w-48" />
      <h2 class="title text-5xl">C'est fini pour aujourd'hui !</h2>
      <p class="text-2xl">
        {{ fishWon > 0 ? `Tu as gagné ${fishWon} poisson${fishWon > 1 ? 's' : ''} aujourd'hui.` : 'Merci d’avoir joué !' }}
      </p>
      <button type="button" class="btn btn-primary" @click="emit('exit')">Retour</button>
    </div>
  </div>
</template>
