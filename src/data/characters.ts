export type CharacterId = 'dauphin' | 'tortue' | 'poulpe' | 'hippocampe' | 'baleine' | 'raie'

export interface Character {
  id: CharacterId
  name: string
  /** "le dauphin", used in sentences */
  article: string
  body: string
  belly: string
}

/**
 * The child chooses a sea animal when the profile is created; the others are unlocked by
 * collecting reward fish (paper: "unlock a new character"), in list order.
 */
export const CHARACTERS: readonly Character[] = [
  { id: 'dauphin', name: 'Dauphin', article: 'le dauphin', body: '#4aa3df', belly: '#d8f0ff' },
  { id: 'tortue', name: 'Tortue', article: 'la tortue', body: '#5bb974', belly: '#c9a66b' },
  { id: 'poulpe', name: 'Poulpe', article: 'le poulpe', body: '#c06fd8', belly: '#f3d6fb' },
  { id: 'hippocampe', name: 'Hippocampe', article: "l'hippocampe", body: '#f29b38', belly: '#ffe2b8' },
  { id: 'baleine', name: 'Baleine', article: 'la baleine', body: '#3d5a98', belly: '#dfe7f7' },
  { id: 'raie', name: 'Raie', article: 'la raie', body: '#2bb3a6', belly: '#d4f5f1' },
]

/** fish needed to own 1, 2, 3… characters (the first one is chosen freely) */
export const UNLOCK_AT = [0, 3, 7, 12, 18, 25]

export const allowedCount = (fish: number): number => UNLOCK_AT.filter((t) => fish >= t).length

/** fish needed for the next unlock, or null when every character is owned */
export const nextUnlockAt = (fish: number): number | null => UNLOCK_AT.find((t) => t > fish) ?? null

/** Characters owned by a profile (profiles created before the free choice have no `owned` list). */
export function ownedCharacters(owned: CharacterId[] | undefined, character: CharacterId, fish: number): CharacterId[] {
  if (owned?.length) return owned
  const legacy = CHARACTERS.slice(0, allowedCount(fish)).map((c) => c.id)
  return legacy.includes(character) ? legacy : [...legacy, character]
}

export const characterById = (id: string): Character => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0]

/** Colours of the reward fish, cycled as the aquarium fills. */
export const FISH_COLORS = ['#ff8a5c', '#ffd166', '#06d6a0', '#ef476f', '#a78bfa', '#4cc9f0', '#f4a261', '#90be6d']
