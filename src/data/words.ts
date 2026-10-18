export const NUMBER_WORDS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix']

export const numberWord = (n: number): string => NUMBER_WORDS[n] ?? String(n)

export const operationWords = (a: number, op: '+' | '-', b: number): string =>
  `${numberWord(a)} ${op === '+' ? 'plus' : 'moins'} ${numberWord(b)}`
