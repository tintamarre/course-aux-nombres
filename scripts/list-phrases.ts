// Prints every sentence the game can say, as JSON {sentence: text to synthesise}
// (input of scripts/audio/generate.py).
import { allPhrases } from '../src/data/phrases'
import { pronounce } from '../src/data/words'

console.log(JSON.stringify(Object.fromEntries(allPhrases().map((t) => [t, pronounce(t)])), null, 1))
