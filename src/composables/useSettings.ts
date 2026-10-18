import { reactive, watch } from 'vue'
import { loadJson, saveJson } from './useStorage'

export interface Settings {
  voice: boolean
  /** speech rate, 1 = normal */
  voiceRate: number
  sounds: boolean
  /** the computer places the gold pieces on the board instead of the child */
  autoMove: boolean
  /** suggested session length; 0 = no limit */
  sessionMinutes: number
}

const KEY = 'can-settings'

const settings = reactive<Settings>(
  loadJson<Settings>(KEY, { voice: true, voiceRate: 1, sounds: true, autoMove: false, sessionMinutes: 20 }),
)

watch(settings, () => saveJson(KEY, settings), { deep: true })

export function useSettings() {
  return settings
}
