<script setup lang="ts">
/** Space for the speech therapist, teacher or parent: follow-up, profiles, settings, about. */
import { computed, ref } from 'vue'
import { PRIORS, PROGRESSIONS, type PriorName, type ProgressionName } from '../engine/adaptive'
import { LEVELS } from '../engine/levels'
import { knowledgeOf, trialsToCsv, useProfiles } from '../composables/useProfiles'
import { useSettings } from '../composables/useSettings'
import { currentVoiceName, frenchVoices, hush, pickVoice, say, speechAvailable, voiceCredit } from '../composables/useSpeech'
import { phrases } from '../data/phrases'
import { unlockAudio } from '../composables/useSounds'
import KnowledgeMap from './KnowledgeMap.vue'
import TrendChart from './TrendChart.vue'

const emit = defineEmits<{ close: [] }>()
const { profiles, current, create, select, remove, resetKnowledge, setProgression } = useProfiles()
const settings = useSettings()

const tab = ref<'suivi' | 'profils' | 'reglages' | 'apropos'>(current.value ? 'suivi' : 'profils')
const tabs = [
  { id: 'suivi', label: 'Suivi' },
  { id: 'profils', label: 'Profils' },
  { id: 'reglages', label: 'Réglages' },
  { id: 'apropos', label: 'À propos' },
] as const

const priorLabels: Record<PriorName, string> = {
  aucun: 'Aucun (version 2006 : tout part du hasard)',
  debutant: 'Débutant (cube 0–0,2 réussi)',
  modere: 'Modéré (cube 0–0,4 réussi, recommandé)',
}

const progressionLabels: Record<ProgressionName, string> = {
  article: 'Progression de l’article',
  rapide: 'Progression rapide',
}

const newName = ref('')
const newPrior = ref<PriorName>('modere')
function addProfile() {
  create(newName.value, newPrior.value)
  newName.value = ''
}

/* --- follow-up --- */
const ks = computed(() => (current.value ? knowledgeOf(current.value) : null))
const trials = computed(() => current.value?.trials ?? [])
const recent = computed(() => trials.value.slice(-20))
const pct = (x: number) => `${Math.round(x * 100)} %`
const stats = computed(() => {
  const t = trials.value
  const rts = t.filter((x) => x.choice !== null).map((x) => x.rt).sort((a, b) => a - b)
  const sessions = (current.value?.sessions ?? []).filter((s) => s.trials > 0)
  return {
    trials: t.length,
    sessions: sessions.length,
    minutes: Math.round(sessions.reduce((a, s) => a + (s.end - s.start), 0) / 60000),
    recentRate: recent.value.length ? recent.value.filter((x) => x.correct).length / recent.value.length : 0,
    level: recent.value.length ? Math.round(recent.value.reduce((a, x) => a + x.level, 0) / recent.value.length) : 1,
    medianRt: rts.length ? rts[Math.floor(rts.length / 2)] / 1000 : 0,
    volume: ks.value?.volume() ?? 0,
  }
})
const maps = computed(() =>
  ks.value
    ? [
        { grid: ks.value.projection(0), x: 'distance', y: 'complexité' },
        { grid: ks.value.projection(1), x: 'vitesse', y: 'complexité' },
        { grid: ks.value.projection(2), x: 'vitesse', y: 'distance' },
      ]
    : [],
)
const sessions = computed(() => [...(current.value?.sessions ?? [])].filter((s) => s.trials > 0).reverse().slice(0, 12))
const fmtDate = (t: number) => new Date(t).toLocaleString('fr-BE', { dateStyle: 'short', timeStyle: 'short' })

function exportCsv() {
  if (!current.value) return
  const blob = new Blob(['﻿' + trialsToCsv(current.value)], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `recif-des-nombres_${current.value.name}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

function chooseVoice() {
  pickVoice()
  testFallback()
}
/** the recorded voice, as heard in the game */
function testVoice() {
  unlockAudio()
  hush()
  for (const text of [phrases.chose(5), phrases.compare(5, 2), phrases.verdictWin(), phrases.number(8), phrases.number(9), phrases.number(10), phrases.number(11), phrases.operation(7, '+', 4, 11)]) void say(text)
}
/** the speech synthesis of the device, used only when a sentence has no recording */
function testFallback() {
  unlockAudio()
  hush()
  void say('Voici la voix de secours de cet appareil : quatorze, quinze, seize.')
}

function confirmReset() {
  if (current.value && confirm(`Remettre à zéro l'estimation des compétences de ${current.value.name} ? Les poissons et l'historique sont conservés.`))
    resetKnowledge(current.value, current.value.prior)
}
function confirmRemove(id: string, name: string) {
  if (confirm(`Supprimer définitivement le profil ${name} et toutes ses données ?`)) remove(id)
}
</script>

<template>
  <div class="adult h-full overflow-y-auto bg-[#f6f3ec] text-[#1d2b36]">
    <header class="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-black/10 bg-[#f6f3ec]/95 px-4 py-3 backdrop-blur">
      <h1 class="mr-auto text-xl font-bold">Espace adulte</h1>
      <nav class="flex gap-1 rounded-xl bg-black/5 p-1">
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-semibold"
          :class="tab === t.id ? 'bg-white shadow-sm' : 'opacity-70 hover:opacity-100'"
          @click="tab = t.id"
        >
          {{ t.label }}
        </button>
      </nav>
      <button type="button" class="rounded-lg bg-[#087e8b] px-4 py-2 text-sm font-bold text-white" @click="emit('close')">Retour au jeu</button>
    </header>

    <main class="mx-auto max-w-5xl space-y-6 p-4">
      <!-- SUIVI -->
      <template v-if="tab === 'suivi'">
        <p v-if="!current" class="card">Aucun profil sélectionné. Créez-en un dans l'onglet Profils.</p>
        <template v-else>
          <div class="flex flex-wrap items-baseline gap-3">
            <h2 class="text-2xl font-bold">{{ current.name }}</h2>
            <span class="text-sm opacity-70">profil créé le {{ fmtDate(current.createdAt) }}</span>
            <span class="ml-auto flex gap-2">
              <button type="button" class="btn-sm" :disabled="!trials.length" @click="exportCsv">Exporter (CSV)</button>
              <button type="button" class="btn-sm" @click="confirmReset">Réinitialiser l'algorithme</button>
            </span>
          </div>

          <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div class="card"><div class="stat">{{ stats.trials }}</div><div class="label">essais</div></div>
            <div class="card"><div class="stat">{{ stats.sessions }}</div><div class="label">séances · {{ stats.minutes }} min</div></div>
            <div class="card"><div class="stat">{{ pct(stats.recentRate) }}</div><div class="label">réussite, 20 derniers essais</div></div>
            <div class="card"><div class="stat">{{ stats.level }}</div><div class="label">niveau de complexité récent</div></div>
            <div class="card"><div class="stat">{{ stats.medianRt.toFixed(1) }} s</div><div class="label">temps de réponse médian</div></div>
            <div class="card"><div class="stat">{{ pct(stats.volume) }}</div><div class="label">espace maîtrisé (p ≥ 75 %)</div></div>
            <div class="card"><div class="stat">{{ current.fish }}</div><div class="label">poissons gagnés</div></div>
            <div class="card"><div class="goal">{{ LEVELS[stats.level - 1].goal }}</div><div class="label">objectif du niveau</div></div>
          </div>

          <section class="card">
            <h3 class="mb-2 font-bold">Évolution</h3>
            <TrendChart v-if="trials.length > 1" :trials="trials" />
            <p v-else class="text-sm opacity-70">Pas encore assez d'essais.</p>
          </section>

          <section class="card">
            <h3 class="font-bold">Espace des connaissances estimé</h3>
            <p class="mb-3 text-sm opacity-70">
              Probabilité de réussite estimée par l'algorithme, en moyenne sur la troisième dimension. Plus c'est foncé, mieux c'est réussi ;
              la difficulté augmente vers la droite et vers le haut.
            </p>
            <div class="grid gap-4 sm:grid-cols-3">
              <KnowledgeMap v-for="m in maps" :key="m.x + m.y" :grid="m.grid" :x-label="m.x" :y-label="m.y" />
            </div>
          </section>

          <section class="card overflow-x-auto">
            <h3 class="mb-2 font-bold">Dernières séances</h3>
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left opacity-70"><th class="py-1">Date</th><th>Durée</th><th>Essais</th><th>Réussite</th></tr>
              </thead>
              <tbody>
                <tr v-for="s in sessions" :key="s.start" class="border-t border-black/5">
                  <td class="py-1">{{ fmtDate(s.start) }}</td>
                  <td>{{ Math.max(1, Math.round((s.end - s.start) / 60000)) }} min</td>
                  <td>{{ s.trials }}</td>
                  <td>{{ pct(s.correct / s.trials) }}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </template>
      </template>

      <!-- PROFILS -->
      <template v-else-if="tab === 'profils'">
        <section class="card space-y-3">
          <h3 class="font-bold">Nouveau profil</h3>
          <p class="text-sm opacity-70">
            Les données restent dans ce navigateur, sur cet appareil. Un prénom ou un pseudonyme suffit.
          </p>
          <div class="flex flex-wrap gap-2">
            <input v-model="newName" class="input flex-1" placeholder="Prénom ou pseudonyme" maxlength="24" @keyup.enter="addProfile" />
            <select v-model="newPrior" class="input">
              <option v-for="(_, k) in PRIORS" :key="k" :value="k">{{ priorLabels[k] }}</option>
            </select>
            <button type="button" class="rounded-lg bg-[#087e8b] px-4 py-2 font-bold text-white" @click="addProfile">Créer</button>
          </div>
        </section>
        <section class="card">
          <h3 class="mb-2 font-bold">Profils</h3>
          <p v-if="!profiles.length" class="text-sm opacity-70">Aucun profil.</p>
          <p class="mb-2 text-sm opacity-70">
            La progression rapide fait monter la difficulté plus vite après chaque réponse (environ deux fois plus vite pour atteindre le niveau 9 en simulation),
            en gardant une réussite proche de 75 %. Elle s'écarte des paramètres de l'article ; on peut la changer à tout moment sans perdre ce que l'algorithme a appris.
          </p>
          <ul class="divide-y divide-black/5">
            <li v-for="p in profiles" :key="p.id" class="flex flex-wrap items-center gap-3 py-2">
              <input type="radio" :checked="current?.id === p.id" :aria-label="`choisir ${p.name}`" @change="select(p.id)" />
              <span class="font-semibold">{{ p.name }}</span>
              <span class="text-sm opacity-60">{{ p.trials.length }} essais · {{ p.fish }} poissons · départ {{ p.prior }}</span>
              <select
                class="input ml-auto py-1 text-sm"
                :value="p.progression ?? 'article'"
                :aria-label="`progression de ${p.name}`"
                @change="setProgression(p, ($event.target as HTMLSelectElement).value as ProgressionName)"
              >
                <option v-for="(_, k) in PROGRESSIONS" :key="k" :value="k">{{ progressionLabels[k] }}</option>
              </select>
              <button type="button" class="btn-sm" @click="confirmRemove(p.id, p.name)">Supprimer</button>
            </li>
          </ul>
        </section>
      </template>

      <!-- RÉGLAGES -->
      <template v-else-if="tab === 'reglages'">
        <section class="card space-y-4">
          <label class="flex items-center gap-3">
            <input v-model="settings.voice" type="checkbox" class="h-5 w-5" />
            <span>Voix (nombres prononcés et consignes)</span>
            <span v-if="!speechAvailable()" class="text-sm text-red-700">synthèse vocale indisponible dans ce navigateur</span>
          </label>
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-3">
              <span>Voix enregistrée</span>
              <span class="text-sm opacity-70">Siwis, la même sur tous les appareils</span>
              <button type="button" class="btn-sm" @click="testVoice">Écouter</button>
            </div>
            <details v-if="speechAvailable()" class="text-sm">
              <summary class="cursor-pointer opacity-80">Voix de secours (synthèse de l'appareil, si une phrase n'a pas d'enregistrement)</summary>
              <div class="mt-2 space-y-2">
                <label class="flex flex-wrap items-center gap-3">
                  <select v-model="settings.voiceURI" class="input max-w-full" @change="chooseVoice">
                    <option value="">Automatique ({{ settings.voiceURI ? '…' : currentVoiceName() || 'aucune' }})</option>
                    <option v-for="v in frenchVoices" :key="v.voiceURI" :value="v.voiceURI">{{ v.name }} ({{ v.lang }})</option>
                  </select>
                  <button type="button" class="btn-sm" @click="testFallback">Écouter</button>
                </label>
                <label class="flex flex-wrap items-center gap-3">
                  <span>Débit</span>
                  <input v-model.number="settings.voiceRate" type="range" min="0.6" max="1.3" step="0.05" class="w-48" />
                  <span class="opacity-70">{{ settings.voiceRate.toFixed(2) }}</span>
                </label>
              </div>
            </details>
          </div>
          <label class="flex items-center gap-3">
            <input v-model="settings.sounds" type="checkbox" class="h-5 w-5" />
            <span>Petits effets sonores</span>
          </label>
          <label class="flex items-center gap-3">
            <input v-model="settings.readyButton" type="checkbox" class="h-5 w-5" />
            <span>Bouton « ▶ » au début de chaque manche (les trésors n'apparaissent que quand l'enfant est prêt)</span>
          </label>
          <label class="flex items-center gap-3">
            <input v-model="settings.autoMove" type="checkbox" class="h-5 w-5" />
            <span>Déplacement automatique sur la piste (l'ordinateur pose les pièces en comptant)</span>
          </label>
          <label class="flex flex-wrap items-center gap-3">
            <span>Temps minimum pour répondre quand la clé apparaît</span>
            <select v-model.number="settings.minDeadline" class="input">
              <option :value="0.25">0,25 s (article)</option>
              <option :value="1">1 s</option>
              <option :value="1.5">1,5 s</option>
              <option :value="2">2 s (recommandé pour les 5-8 ans)</option>
              <option :value="3">3 s</option>
              <option :value="5">5 s</option>
            </select>
          </label>
          <p class="-mt-2 text-sm opacity-70">
            Le délai donné par l'algorithme varie d'un essai à l'autre (de 10 s au minimum choisi ici) ; sous un certain niveau de vitesse, il n'y a pas de délai du tout.
          </p>
          <label class="flex flex-wrap items-center gap-3">
            <span>Durée de séance proposée</span>
            <select v-model.number="settings.sessionMinutes" class="input">
              <option :value="10">10 min</option>
              <option :value="15">15 min</option>
              <option :value="20">20 min</option>
              <option :value="30">30 min (protocole de l'étude 2006)</option>
              <option :value="0">sans limite</option>
            </select>
          </label>
          <p class="text-sm opacity-70">
            La séance se termine à la fin du tour en cours une fois la durée atteinte. Dans l'étude originale : 30 minutes par jour,
            4 jours par semaine, pendant 5 semaines.
          </p>
        </section>
      </template>

      <!-- À PROPOS -->
      <template v-else>
        <section class="card prose-sm space-y-3 leading-relaxed">
          <h3 class="text-lg font-bold">Le Récif des nombres, réimplémentation libre</h3>
          <p>
            Ce jeu reproduit les principes de <em>The Number Race</em> (« La Course aux nombres »), logiciel adaptatif de remédiation de la
            dyscalculie conçu par Anna Wilson, Stanislas Dehaene et leurs collègues de l'unité INSERM-CEA de neuro-imagerie cognitive.
            Il s'agit d'une réécriture indépendante, non affiliée à l'INSERM ni aux auteurs, fondée sur l'article publié en accès libre :
          </p>
          <p class="rounded-lg bg-black/5 p-3 text-sm">
            Wilson, A. J., Dehaene, S., Pinel, P., Revkin, S. K., Cohen, L. &amp; Cohen, D. (2006). Principles underlying the design of
            "The Number Race", an adaptive computer game for remediation of dyscalculia. <em>Behavioral and Brain Functions</em>, 2:19.
            <a class="underline" href="https://doi.org/10.1186/1744-9081-2-19" target="_blank" rel="noopener">doi:10.1186/1744-9081-2-19</a>
          </p>
          <h4 class="font-bold">Ce qui est repris fidèlement</h4>
          <ul class="list-disc space-y-1 pl-5">
            <li>La tâche principale : comparer deux quantités de 1 à 9 et choisir la plus grande.</li>
            <li>Les trois dimensions de difficulté : distance numérique (rapport de Weber, R = 2), vitesse (délai de 10 s à 0,25 s), complexité conceptuelle (14 niveaux du tableau 1).</li>
            <li>L'algorithme adaptatif multidimensionnel (matrice 20 × 20 × 20, cible 75 % de réussite) avec les paramètres de l'article.</li>
            <li>Après chaque choix : la quantité dans les trois formats (pièces, chiffre, mot prononcé).</li>
            <li>La piste : déplacement par correspondance terme à terme, comptage à voix haute, anémones à partir du niveau 9 (ici sur le même écran que les trésors).</li>
            <li>Les récompenses : poissons et nouveaux personnages ; le démarrage avec connaissances préalables de la version révisée.</li>
          </ul>
          <p>
            Le détail de la méthodologie et des choix d'implémentation est documenté dans le dépôt :
            <a class="underline" href="https://github.com/tintamarre/recif-des-nombres" target="_blank" rel="noopener">github.com/tintamarre/recif-des-nombres</a>.
          </p>
          <p class="text-sm opacity-70">{{ voiceCredit }} (https://datashare.is.ed.ac.uk/handle/10283/2353).</p>
          <p class="text-sm opacity-70">
            Ce jeu est un support d'entraînement. Il ne remplace ni un bilan ni une prise en charge logopédique ou orthophonique.
          </p>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.card {
  border-radius: 1rem;
  background: #fff;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.stat {
  font-size: 1.75rem;
  font-weight: 800;
  color: #087e8b;
}
.goal {
  font-weight: 700;
  line-height: 1.3;
  color: #087e8b;
}
.label {
  font-size: 0.8rem;
  opacity: 0.7;
}
.btn-sm {
  border-radius: 0.5rem;
  border: 1px solid rgba(0, 0, 0, 0.15);
  background: #fff;
  padding: 0.35rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
}
.btn-sm:disabled {
  opacity: 0.4;
}
.input {
  border-radius: 0.5rem;
  border: 1px solid rgba(0, 0, 0, 0.2);
  background: #fff;
  padding: 0.5rem 0.75rem;
}
</style>
