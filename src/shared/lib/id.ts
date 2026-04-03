export function makeId(prefix = 'id'): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
