export const NUMBER_WORDS = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf', 'vingt',
  'vingt et un', 'vingt-deux', 'vingt-trois', 'vingt-quatre', 'vingt-cinq', 'vingt-six', 'vingt-sept', 'vingt-huit', 'vingt-neuf', 'trente',
  'trente et un', 'trente-deux', 'trente-trois', 'trente-quatre', 'trente-cinq', 'trente-six', 'trente-sept', 'trente-huit', 'trente-neuf', 'quarante',
]

export const numberWord = (n: number): string => NUMBER_WORDS[n] ?? String(n)

export const operationWords = (a: number, op: '+' | '-', b: number): string =>
  `${numberWord(a)} ${op === '+' ? 'plus' : 'moins'} ${numberWord(b)}`

const PLUS_BEFORE_NUMBER = new RegExp(`\\bplus (?=(${NUMBER_WORDS.join('|')})\\b)`, 'g')

/**
 * Text given to the speech engines: in an operation « plus » is said « plusse », but the engines
 * read it « plu » (as in « plus grand »). Only the sound changes, the text shown stays « plus ».
 */
export const pronounce = (text: string): string => text.replace(PLUS_BEFORE_NUMBER, 'plusse ')
