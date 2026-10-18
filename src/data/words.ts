export const NUMBER_WORDS = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf', 'vingt',
]

export const numberWord = (n: number): string => NUMBER_WORDS[n] ?? String(n)

export const operationWords = (a: number, op: '+' | '-', b: number): string =>
  `${numberWord(a)} ${op === '+' ? 'plus' : 'moins'} ${numberWord(b)}`
