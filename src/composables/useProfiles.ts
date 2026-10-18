/**
 * Child profiles, stored locally in the browser only (no server, no personal data sent anywhere).
 * A profile keeps the knowledge matrix K, so the game resumes at the right difficulty.
 */
import { computed, markRaw, ref, toRaw } from 'vue'
import { KnowledgeSpace, PAPER_PARAMS, PRIORS, type PriorName } from '../engine/adaptive'
import { loadJson, removeKey, saveJson } from './useStorage'
import type { CharacterId } from '../data/characters'

export interface TrialLog {
  /** timestamp (ms) */
  t: number
  /** difficulty [speed, distance, complexity] */
  d: [number, number, number]
  level: number
  /** e.g. "5" or "3+2" */
  left: string
  right: string
  larger: 'left' | 'right'
  choice: 'left' | 'right' | null
  correct: boolean
  /** response time in ms, from the display of the quantities */
  rt: number
  deadline: number | null
}

export interface SessionLog {
  start: number
  end: number
  trials: number
  correct: number
}

export interface Profile {
  id: string
  name: string
  prior: PriorName
  createdAt: number
  K: number[]
  history: number[]
  trials: TrialLog[]
  sessions: SessionLog[]
  fish: number
  character: CharacterId
  /** characters the child can play with (first one chosen at creation, then unlocked with fish) */
  owned?: CharacterId[]
  /** current race; `length` is set by its first problem (20, 30 or 40 squares), `hazards` by its
   *  first problem of level 9 or more; both stay the same until the end of the race */
  race: { player: number; crab: number; length?: number; hazards?: number[] }
}

const INDEX_KEY = 'can-profiles'
const MAX_TRIALS = 5000

interface Index {
  ids: string[]
  current: string | null
}

const index = ref<Index>(loadJson<Index>(INDEX_KEY, { ids: [], current: null }))
const profiles = ref<Profile[]>(
  index.value.ids.map((id) => loadJson<Profile | Record<string, never>>(`can-profile-${id}`, {})).filter((p): p is Profile => 'id' in p),
)

const saveIndex = () => saveJson(INDEX_KEY, index.value)

/**
 * Saving is deferred and done on the raw object: serialising thousands of trials through Vue's
 * reactive proxies, synchronously after every answer, made the game stutter on tablets.
 */
const pending = new Map<string, Profile>()
let saveTimer: ReturnType<typeof setTimeout> | undefined

export function flushProfiles(): void {
  clearTimeout(saveTimer)
  for (const p of pending.values()) {
    if (p.trials.length > MAX_TRIALS) p.trials.splice(0, p.trials.length - MAX_TRIALS)
    saveJson(`can-profile-${p.id}`, p)
  }
  pending.clear()
}

export function saveProfile(p: Profile): void {
  pending.set(p.id, toRaw(p))
  clearTimeout(saveTimer)
  saveTimer = setTimeout(flushProfiles, 600)
}

if (typeof window !== 'undefined') window.addEventListener('pagehide', flushProfiles)

export function knowledgeOf(p: Profile): KnowledgeSpace {
  return new KnowledgeSpace(PAPER_PARAMS, PRIORS[p.prior], p.K.length ? p.K : undefined, p.history)
}

export function storeKnowledge(p: Profile, ks: KnowledgeSpace): void {
  // markRaw: 8 000 numbers do not need to be reactive
  p.K = markRaw(Array.from(ks.K, (k) => Math.round(k * 1000) / 1000))
  p.history = [...ks.history]
}

export function useProfiles() {
  const current = computed(() => profiles.value.find((p) => p.id === index.value.current) ?? null)

  function create(name: string, prior: PriorName, character: CharacterId = 'dauphin'): Profile {
    const p: Profile = {
      id: Math.random().toString(36).slice(2, 10),
      name: name.trim() || 'Joueur',
      prior,
      createdAt: Date.now(),
      K: [],
      history: [],
      trials: [],
      sessions: [],
      fish: 0,
      character,
      owned: [character],
      race: { player: 0, crab: 0 },
    }
    profiles.value.push(p)
    index.value.ids.push(p.id)
    index.value.current = p.id
    saveProfile(p)
    saveIndex()
    return p
  }

  function select(id: string): void {
    index.value.current = id
    saveIndex()
  }

  function remove(id: string): void {
    profiles.value = profiles.value.filter((p) => p.id !== id)
    index.value.ids = index.value.ids.filter((x) => x !== id)
    if (index.value.current === id) index.value.current = index.value.ids[0] ?? null
    pending.delete(id)
    removeKey(`can-profile-${id}`)
    saveIndex()
  }

  /** Forget what the algorithm learnt (keeps rewards and history). */
  function resetKnowledge(p: Profile, prior: PriorName): void {
    p.prior = prior
    p.K = []
    p.history = []
    saveProfile(p)
  }

  return { profiles, current, create, select, remove, resetKnowledge }
}

export function trialsToCsv(p: Profile): string {
  const head = 'date;niveau;difficulte_vitesse;difficulte_distance;difficulte_complexite;gauche;droite;plus_grand;choix;correct;temps_reponse_ms;delai_s'
  const rows = p.trials.map((t) =>
    [
      new Date(t.t).toISOString(),
      t.level,
      ...t.d.map((x) => x.toFixed(3)),
      t.left,
      t.right,
      t.larger === 'left' ? 'gauche' : 'droite',
      t.choice === null ? 'temps écoulé' : t.choice === 'left' ? 'gauche' : 'droite',
      t.correct ? 1 : 0,
      t.rt,
      t.deadline === null ? '' : t.deadline.toFixed(2),
    ].join(';'),
  )
  return [head, ...rows].join('\n')
}
