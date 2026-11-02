export type ApplicationRoute =
  | '/setup'
  | '/unlock'
  | '/(tabs)'
  | '/dashboard'
  | '/properties'
  | '/properties/new'
  | '/properties/archived'
  | `/properties/${string}`
  | '/tenants'
  | '/tenants/new'
  | '/tenants/archived'
  | `/tenants/${string}`
  | '/agreements'
  | '/agreements/new'
  | `/agreements/${string}`
  | '/rent'
  | '/rent/record'
  | '/rent/payments'
  | `/rent/payments/${string}`
  | `/rent/agreements/${string}`
  | `/rent/agreements/${string}/pay`
  | `/rent/tenants/${string}`
  | '/receipts'
  | '/receipts/new'
  | `/receipts/${string}`
  | '/settings';

/**
 * Launch gate: where may an app start? Not initialized always goes to Setup;
 * an initialized application goes to the authenticated area only when the
 * runtime session is already authenticated, otherwise to Unlock.
 */
export function resolveInitialRoute(input: {
  initialized: boolean;
  authenticated: boolean;
}): ApplicationRoute {
  if (!input.initialized) {
    return '/setup';
  }
  return input.authenticated ? '/(tabs)' : '/unlock';
}

/**
 * Minimal protected-route boundary for the single local owner: unauthenticated
 * visitors are always sent back to Unlock. No roles or permissions exist.
 */
export function resolveProtectedRoute(input: {
  authenticated: boolean;
  destination: ApplicationRoute;
}): ApplicationRoute {
  return input.authenticated ? input.destination : '/unlock';
}
