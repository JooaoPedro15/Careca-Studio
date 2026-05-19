const TLD_REGEX = /\.(com|br|net|org|io|co|gg|tv|app|store)(\.[a-z]{2})?$/i

export function normalizeBrandName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(TLD_REGEX, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
