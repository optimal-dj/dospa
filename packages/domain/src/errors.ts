/**
 * Erreur métier identifiée par un code qui est aussi une clé de traduction (namespace `errors`).
 * Le message technique éventuel n'est jamais affiché à l'utilisateur.
 */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(code);
    this.name = 'DomainError';
  }
}

export function isDomainError(e: unknown): e is DomainError {
  return e instanceof DomainError;
}
