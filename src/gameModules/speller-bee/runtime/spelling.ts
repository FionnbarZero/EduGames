export function normalizeSpelling(value: string) {
  return value.normalize('NFKC').trim().toLocaleLowerCase('en-US')
}

export function spellingIsCorrect(response: string, target: string) {
  return normalizeSpelling(response) === normalizeSpelling(target)
}
