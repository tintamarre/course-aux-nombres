export type CharacterId = 'dauphin' | 'tortue' | 'poulpe' | 'hippocampe' | 'baleine' | 'raie'

export interface Character {
  id: CharacterId
  name: string
  /** "le dauphin", used in sentences */
  article: string
  body: string
  belly: string
  /** fish needed to unlock it */
  unlockAt: number
}

/** The child plays a sea animal; new ones are unlocked by collecting reward fish (paper: "unlock a new character"). */
export const CHARACTERS: readonly Character[] = [
  { id: 'dauphin', name: 'Dauphin', article: 'le dauphin', body: '#4aa3df', belly: '#d8f0ff', unlockAt: 0 },
  { id: 'tortue', name: 'Tortue', article: 'la tortue', body: '#5bb974', belly: '#c9a66b', unlockAt: 3 },
  { id: 'poulpe', name: 'Poulpe', article: 'le poulpe', body: '#c06fd8', belly: '#f3d6fb', unlockAt: 7 },
  { id: 'hippocampe', name: 'Hippocampe', article: "l'hippocampe", body: '#f29b38', belly: '#ffe2b8', unlockAt: 12 },
  { id: 'baleine', name: 'Baleine', article: 'la baleine', body: '#3d5a98', belly: '#dfe7f7', unlockAt: 18 },
  { id: 'raie', name: 'Raie', article: 'la raie', body: '#2bb3a6', belly: '#d4f5f1', unlockAt: 25 },
]

export const characterById = (id: string): Character => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0]

/** Colours of the reward fish, cycled as the aquarium fills. */
export const FISH_COLORS = ['#ff8a5c', '#ffd166', '#06d6a0', '#ef476f', '#a78bfa', '#4cc9f0', '#f4a261', '#90be6d']
