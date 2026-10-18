<script setup lang="ts">
/**
 * Comparison screen: the child chooses the larger of two treasures before the crab reaches the key.
 * What is shown before the choice depends on the complexity level (Table 1); after the choice the
 * quantity is always given in all three formats: gold pieces, digit and spoken word.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Problem, Quantity, Side } from '../engine/problem'
import { layoutDots } from '../engine/dots'
import { BOX } from '../engine/dots'
import { numberWord, operationWords } from '../data/words'
import { hush, say } from '../composables/useSpeech'
import { sounds } from '../composables/useSounds'
import CharacterSprite from './CharacterSprite.vue'
import CrabSprite from './CrabSprite.vue'
import CoinIcon from './CoinIcon.vue'
import CoinRows from './CoinRows.vue'

const props = defineProps<{ problem: Problem; character: string }>()
const emit = defineEmits<{ done: [choice: Side | null, rt: number] }>()

type Phase = 'present' | 'reveal'
const phase = ref<Phase>('present')
const speaking = ref<Side | null>(null)
const crabRunning = ref(false)
const crabEl = ref<HTMLElement | null>(null)
const crabLeft = ref('80%')
const choice = ref<Side | null>(null)
const timedOut = ref(false)
const opStep = ref(0)
const message = ref('')

const lvl = computed(() => props.problem.level)
const sides: Side[] = ['left', 'right']
const q = (s: Side): Quantity => props.problem[s]
const dots = {
  left: layoutDots(props.problem.left.operation ? 0 : props.problem.left.value, props.problem.dotControl, Math.random),
  right: layoutDots(props.problem.right.operation ? 0 : props.problem.right.value, props.problem.dotControl, Math.random),
}
const winner = computed<Side | null>(() => (choice.value === null ? null : choice.value))
const playerGot = computed(() => (winner.value ? q(winner.value).value : q(props.problem.larger === 'left' ? 'right' : 'left').value))
const correct = computed(() => choice.value === props.problem.larger && !timedOut.value)

let shownAt = 0
let alive = true
let deadlineTimer: ReturnType<typeof setTimeout> | undefined
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

const spokenText = (s: Side) => {
  const op = q(s).operation
  return op ? operationWords(op.a, op.op, op.b) : numberWord(q(s).value)
}

onMounted(async () => {
  shownAt = performance.now()
  if (lvl.value.spoken) {
    for (const s of sides) {
      if (!alive || phase.value !== 'present') return
      speaking.value = s
      await say(spokenText(s))
      speaking.value = null
      await wait(150)
    }
  }
  if (!alive || phase.value !== 'present') return
  if (props.problem.deadline !== null) {
    crabRunning.value = true
    crabLeft.value = '56%'
    deadlineTimer = setTimeout(() => finish(null), props.problem.deadline * 1000)
  }
})

onBeforeUnmount(() => {
  alive = false
  clearTimeout(deadlineTimer)
  hush()
})

function choose(s: Side) {
  if (phase.value !== 'present') return
  sounds.tap()
  finish(s)
}

async function finish(s: Side | null) {
  clearTimeout(deadlineTimer)
  hush()
  const rt = Math.round(performance.now() - shownAt)
  timedOut.value = s === null
  // when time runs out, the crab takes the larger treasure and the child gets the other one
  choice.value = s ?? (props.problem.larger === 'left' ? 'right' : 'left')
  // freeze the crab where it is (at the key if time ran out)
  if (crabEl.value && crabRunning.value) crabLeft.value = s === null ? '56%' : getComputedStyle(crabEl.value).left
  crabRunning.value = false
  phase.value = 'reveal'

  // concretise operations: first operand, then the transformation, then the result
  if (props.problem.left.operation || props.problem.right.operation) {
    await wait(500)
    opStep.value = 1
    await wait(1300)
    opStep.value = 2
  }
  if (!alive) return

  correct.value ? sounds.win() : sounds.lose()
  message.value = timedOut.value
    ? 'Trop tard ! Le crabe a pris le plus grand trésor.'
    : correct.value
      ? 'Tu as le plus !'
      : 'Le crabe a le plus !'
  await say(`${timedOut.value ? 'Tu as' : 'Tu as choisi'} ${numberWord(playerGot.value)}.`)
  if (!alive) return
  await say(message.value)
  await wait(700)
  if (alive) emit('done', timedOut.value ? null : s, rt)
}

/** Final display of a quantity after the choice. */
function revealCoins(s: Side) {
  const op = q(s).operation
  if (!op) return { count: q(s).value, added: 0, removed: 0 }
  if (op.op === '+') return { count: op.a, added: opStep.value >= 1 ? op.b : 0, removed: 0 }
  return { count: op.a, added: 0, removed: opStep.value >= 1 ? op.b : 0 }
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- the race to the key: player on the left, key in the middle, crab coming from the right -->
    <div class="relative mx-auto h-[22vh] w-full max-w-5xl">
      <div class="absolute bottom-0 left-[4%] w-[16vh] min-w-20">
        <CharacterSprite :id="character" :mood="phase === 'reveal' ? (correct ? 'happy' : 'sad') : 'neutral'" class="bob" />
      </div>
      <svg viewBox="0 0 60 60" class="absolute bottom-[10%] left-1/2 w-[8vh] min-w-10 -translate-x-1/2" aria-label="clé">
        <circle cx="18" cy="30" r="12" fill="none" stroke="#f8c73c" stroke-width="6" />
        <path d="M30 30 H54 M46 30 V40 M54 30 V42" stroke="#f8c73c" stroke-width="6" stroke-linecap="round" fill="none" />
      </svg>
      <div
        ref="crabEl"
        class="absolute bottom-0 w-[15vh] min-w-20"
        :class="crabRunning ? 'crab-run' : ''"
        :style="{ left: crabLeft, transitionDuration: crabRunning ? `${problem.deadline}s` : '0s', transform: 'scaleX(-1)' }"
      >
        <CrabSprite :walking="crabRunning" :mood="phase === 'reveal' ? (correct ? 'sad' : 'happy') : 'neutral'" />
      </div>
    </div>

    <!-- the two treasures -->
    <div class="mx-auto grid w-full max-w-5xl flex-1 grid-cols-2 gap-[4vw] px-[4vw] pb-[4vh]">
      <button
        v-for="s in sides"
        :key="s"
        type="button"
        class="treasure relative flex flex-col items-center justify-center rounded-[2rem] p-4 transition"
        :class="{
          'ring-4 ring-white/80': speaking === s,
          'treasure-chosen': phase === 'reveal' && choice === s,
          'opacity-90': phase === 'reveal' && choice !== s,
        }"
        :disabled="phase !== 'present'"
        :aria-label="`trésor de ${s === 'left' ? 'gauche' : 'droite'}`"
        @click="choose(s)"
      >
        <template v-if="phase === 'present'">
          <div v-if="q(s).operation" class="number text-[12vh] leading-none text-[#12263a]">
            {{ q(s).operation!.a }}<span class="mx-[0.15em] text-[0.8em]">{{ q(s).operation!.op === '+' ? '+' : '−' }}</span>{{ q(s).operation!.b }}
          </div>
          <template v-else>
            <div v-if="lvl.digits" class="number text-[12vh] leading-none text-[#12263a]">{{ q(s).value }}</div>
            <svg
              v-if="lvl.dots"
              :viewBox="`0 0 ${BOX} ${BOX}`"
              class="w-full max-w-[34vh]"
              :class="{ 'fade-out': lvl.fadeSeconds !== null }"
              :style="lvl.fadeSeconds !== null ? { animationDuration: `${lvl.fadeSeconds}s` } : {}"
            >
              <CoinIcon v-for="(d, k) in dots[s]" :key="k" :x="d.x" :y="d.y" :r="d.r" />
            </svg>
          </template>
          <svg v-if="speaking === s" viewBox="0 0 24 24" class="absolute top-4 right-4 h-8 w-8 text-[#12263a]/60">
            <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
            <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" />
          </svg>
        </template>

        <!-- after the choice: gold pieces + digit (+ the spoken number) -->
        <template v-else>
          <div class="number text-[10vh] leading-none text-[#12263a]">
            <template v-if="q(s).operation">
              {{ q(s).operation!.a }} {{ q(s).operation!.op === '+' ? '+' : '−' }} {{ q(s).operation!.b }}
              <span v-if="opStep >= 2"> = {{ q(s).value }}</span>
            </template>
            <template v-else>{{ q(s).value }}</template>
          </div>
          <CoinRows v-bind="revealCoins(s)" class="mt-3" />
          <div class="mt-3 h-[9vh] w-[9vh]">
            <CharacterSprite v-if="choice === s" :id="character" />
            <CrabSprite v-else />
          </div>
        </template>
      </button>
    </div>

    <p class="h-10 text-center text-2xl font-bold text-white drop-shadow" aria-live="polite">{{ message }}</p>
  </div>
</template>

<style scoped>
.treasure {
  background: radial-gradient(ellipse at 50% 120%, #f7e3b0 0%, #ecd08f 55%, #dcb974 100%);
  box-shadow: inset 0 -6px 0 rgba(0, 0, 0, 0.08), 0 10px 30px rgba(0, 20, 40, 0.25);
}
.treasure:not(:disabled):hover {
  transform: translateY(-3px);
}
.treasure:not(:disabled):active {
  transform: scale(0.98);
}
.treasure-chosen {
  box-shadow: 0 0 0 6px #fff, 0 10px 30px rgba(0, 20, 40, 0.3);
}
.crab-run {
  transition-property: left;
  transition-timing-function: linear;
}
.fade-out {
  animation: fade-out linear forwards;
}
@keyframes fade-out {
  to { opacity: 0; }
}
</style>
