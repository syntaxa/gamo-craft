export class DomainError extends Error {
  code:
    | 'INSUFFICIENT_FUNDS'
    | 'INVALID_ITEM'
    | 'INVALID_LOOT_TABLE'
    | 'LESSON_ALREADY_REWARDED'
    | 'NO_RESOURCE'
    | 'INVALID_COORDINATE';

  constructor(code: DomainError['code'], message?: string) {
    super(message ?? code);
    this.name = 'DomainError';
    this.code = code;
  }
}
