/** Gate shown when signed-in user cannot access the app yet. */
export type AuthGateStatus =
  | 'purna_pending'
  | 'purna_rejected'
  | 'approved_awaiting_login'
  | 'unregistered'
  | null;

export function isRegistrationAuthGate(
  gate: AuthGateStatus
): gate is 'purna_pending' | 'purna_rejected' | 'approved_awaiting_login' {
  return gate === 'purna_pending' || gate === 'purna_rejected' || gate === 'approved_awaiting_login';
}

/** @deprecated Use isRegistrationAuthGate */
export function isPurnaAuthGate(
  gate: AuthGateStatus
): gate is 'purna_pending' | 'purna_rejected' {
  return gate === 'purna_pending' || gate === 'purna_rejected';
}
