// Prints every sentence the game can say, as JSON (input of scripts/audio/generate.py).
import { allPhrases } from '../src/data/phrases'

console.log(JSON.stringify(allPhrases(), null, 1))
