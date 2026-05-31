/** Gate shown when signed-in user cannot access the app yet. */
export type AuthGateStatus = 'purna_pending' | 'purna_rejected' | 'unregistered' | null;

export function isPurnaAuthGate(
  gate: AuthGateStatus
): gate is 'purna_pending' | 'purna_rejected' {
  return gate === 'purna_pending' || gate === 'purna_rejected';
}
