<script lang="ts">
/** module scope: the same celebration never comes twice in a row */
let lastKind: string | null = null
</script>

<script setup lang="ts">
/**
 * A short random celebration over the reward screen when the child wins a race, on top of the
 * fish added to the aquarium (which keeps the results). Purely decorative: it never blocks a
 * touch and lasts a few seconds.
 */
import { FISH_COLORS } from '../data/characters'
import CharacterSprite from './CharacterSprite.vue'
import CoinIcon from './CoinIcon.vue'
import CrabSprite from './CrabSprite.vue'
import FishSprite from './FishSprite.vue'

const props = defineProps<{ character: string }>()

const KINDS = ['bubbles', 'starfish', 'school', 'chest', 'dance'] as const
type Kind = (typeof KINDS)[number]
const choices = KINDS.filter((k) => k !== lastKind)
const kind: Kind = choices[Math.floor(Math.random() * choices.length)]
lastKind = kind

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const COLORS = ['#ff7eb3', '#f8c73c', '#7fd3e8', '#b48cff', '#7ee08a', '#ff9f5a']

const bubbles = Array.from({ length: 36 }, (_, k) => ({
  left: rand(2, 96),
  size: rand(18, 60),
  delay: rand(0, 1.8),
  dur: rand(2.4, 3.8),
  drift: rand(-40, 40),
  color: COLORS[k % COLORS.length],
}))
const stars = Array.from({ length: 26 }, (_, k) => ({
  left: rand(2, 94),
  size: rand(30, 56),
  delay: rand(0, 1.6),
  dur: rand(2.4, 3.6),
  spin: rand(-540, 540),
  color: COLORS[k % COLORS.length],
}))
const school = Array.from({ length: 14 }, (_, k) => ({
  top: rand(8, 80),
  size: rand(50, 90),
  delay: rand(0, 1.4),
  dur: rand(2.2, 3.2),
  color: FISH_COLORS[k % FISH_COLORS.length],
}))
const coins = Array.from({ length: 22 }, () => ({
  dx: rand(-38, 38),
  up: rand(30, 55),
  delay: 0.7 + rand(0, 0.6),
  dur: rand(1.4, 2),
  size: rand(26, 40),
}))
</script>

<template>
  <div class="celebration pointer-events-none absolute inset-0 z-30 overflow-hidden" :data-kind="kind" aria-hidden="true">
    <!-- bubbles of every colour rising -->
    <template v-if="kind === 'bubbles'">
      <div
        v-for="(b, k) in bubbles"
        :key="k"
        class="bubble absolute bottom-0 rounded-full"
        :style="{
          left: `${b.left}%`,
          width: `${b.size}px`,
          height: `${b.size}px`,
          background: `radial-gradient(circle at 30% 30%, #ffffffcc, ${b.color}aa 60%, ${b.color}55)`,
          animationDelay: `${b.delay}s`,
          animationDuration: `${b.dur}s`,
          '--drift': `${b.drift}px`,
        }"
      />
    </template>

    <!-- a rain of starfish turning as they fall -->
    <template v-else-if="kind === 'starfish'">
      <svg
        v-for="(s, k) in stars"
        :key="k"
        viewBox="-12 -12 24 24"
        class="star absolute top-0"
        :style="{ left: `${s.left}%`, width: `${s.size}px`, animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s`, '--spin': `${s.spin}deg` }"
      >
        <path
          d="M0 -11 L3 -3.5 L10.5 -3.4 L4.6 1.6 L6.8 9.4 L0 4.9 L-6.8 9.4 L-4.6 1.6 L-10.5 -3.4 L-3 -3.5 Z"
          :fill="s.color"
          stroke="#00000022"
          stroke-width="1"
          stroke-linejoin="round"
        />
        <circle cx="0" cy="0" r="1.6" fill="#ffffff88" />
      </svg>
    </template>

    <!-- a school of fish crossing the screen -->
    <template v-else-if="kind === 'school'">
      <div
        v-for="(f, k) in school"
        :key="k"
        class="school-fish absolute left-0"
        :style="{ top: `${f.top}%`, width: `${f.size}px`, animationDelay: `${f.delay}s`, animationDuration: `${f.dur}s` }"
      >
        <FishSprite :color="f.color" />
      </div>
    </template>

    <!-- a treasure chest opens and throws its gold pieces -->
    <template v-else-if="kind === 'chest'">
      <div class="absolute bottom-[6vh] left-1/2 w-[22vh] -translate-x-1/2">
        <div
          v-for="(c, k) in coins"
          :key="k"
          class="coin absolute bottom-[40%] left-1/2"
          :style="{ width: `${c.size}px`, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s`, '--dx': `${c.dx}vw`, '--up': `${c.up}vh` }"
        >
          <svg viewBox="-12 -12 24 24"><CoinIcon :r="11" /></svg>
        </div>
        <svg viewBox="0 0 120 100" class="chest-pop relative w-full overflow-visible">
          <rect x="10" y="45" width="100" height="50" rx="6" fill="#8b5a2b" stroke="#5b3a1a" stroke-width="4" />
          <rect x="10" y="62" width="100" height="8" fill="#f8c73c" />
          <rect x="52" y="56" width="16" height="20" rx="3" fill="#f8c73c" stroke="#c98a1b" stroke-width="2" />
          <g class="chest-lid">
            <path d="M10 47 V30 Q60 4 110 30 V47 Z" fill="#a0692f" stroke="#5b3a1a" stroke-width="4" stroke-linejoin="round" />
            <path d="M54 12 V47" stroke="#f8c73c" stroke-width="6" />
          </g>
        </svg>
      </div>
    </template>

    <!-- the child's animal dances, the crab claps along -->
    <template v-else>
      <div class="absolute inset-x-0 bottom-[4vh] flex items-end justify-center gap-[4vw]">
        <svg viewBox="0 0 76 64" class="dancer w-[28vh] overflow-visible"><CharacterSprite :id="props.character" mood="happy" /></svg>
        <div class="clapper w-[16vh]"><CrabSprite mood="happy" walking /></div>
      </div>
      <svg
        v-for="(s, k) in stars.slice(0, 12)"
        :key="k"
        viewBox="-12 -12 24 24"
        class="sparkle absolute"
        :style="{ left: `${10 + (k % 6) * 15}%`, top: `${12 + Math.floor(k / 6) * 22}%`, width: '34px', animationDelay: `${0.2 + k * 0.15}s` }"
      >
        <path d="M0 -11 L2.5 -2.5 L11 0 L2.5 2.5 L0 11 L-2.5 2.5 L-11 0 L-2.5 -2.5 Z" :fill="s.color" />
      </svg>
    </template>
  </div>
</template>

<style scoped>
.celebration {
  animation: celebration-out 0.6s ease-in 4.6s forwards;
}
@keyframes celebration-out {
  to { opacity: 0; }
}
.bubble {
  transform: translateY(110%);
  animation: rise ease-in both;
}
@keyframes rise {
  from { transform: translate(0, 110%); opacity: 0; }
  10% { opacity: 1; }
  to { transform: translate(var(--drift), -110vh); opacity: 0.8; }
}
.star {
  animation: fall ease-in both;
}
@keyframes fall {
  from { transform: translateY(-15vh) rotate(0deg); }
  to { transform: translateY(110vh) rotate(var(--spin)); }
}
.school-fish {
  animation: swim-across ease-in-out both;
}
@keyframes swim-across {
  from { transform: translateX(-20vw); }
  50% { transform: translateX(50vw) translateY(-12px); }
  to { transform: translateX(110vw); }
}
.chest-pop {
  animation: chest-pop 0.5s ease-out both;
}
@keyframes chest-pop {
  from { transform: scale(0.3); opacity: 0; }
}
.chest-lid {
  transform-origin: 10px 47px;
  animation: lid-open 0.5s ease-out 0.5s both;
}
@keyframes lid-open {
  to { transform: rotate(-35deg) translate(-6px, -6px); }
}
.coin {
  translate: -50% 0;
  animation: coin-burst ease-out both;
}
@keyframes coin-burst {
  from { transform: translate(0, 0) scale(0.4); opacity: 0; }
  10% { opacity: 1; }
  45% { transform: translate(calc(var(--dx) * 0.6), calc(var(--up) * -1)) scale(1); }
  85% { opacity: 1; }
  to { transform: translate(var(--dx), 30vh) scale(1); opacity: 0; }
}
.dancer {
  transform-origin: 50% 100%;
  animation: dance 0.9s ease-in-out 5;
}
@keyframes dance {
  25% { transform: translateY(-14%) rotate(-12deg); }
  50% { transform: translateY(0) rotate(0deg) scaleY(0.92); }
  75% { transform: translateY(-14%) rotate(12deg); }
}
.clapper {
  animation: hop 0.45s ease-in-out 10;
}
@keyframes hop {
  50% { transform: translateY(-18%); }
}
.sparkle {
  animation: sparkle 0.9s ease-in-out both;
  animation-iteration-count: 3;
}
@keyframes sparkle {
  from, to { transform: scale(0) rotate(0deg); opacity: 0; }
  50% { transform: scale(1.2) rotate(45deg); opacity: 1; }
}
</style>
