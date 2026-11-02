import { resolveInitialRoute, resolveProtectedRoute } from './routing';

describe('resolveInitialRoute', () => {
  it('always starts at Setup while the application is not initialized', () => {
    expect(resolveInitialRoute({ initialized: false, authenticated: false })).toBe('/setup');
    expect(resolveInitialRoute({ initialized: false, authenticated: true })).toBe('/setup');
  });

  it('starts at Unlock for an initialized but unauthenticated application', () => {
    expect(resolveInitialRoute({ initialized: true, authenticated: false })).toBe('/unlock');
  });

  it('starts at the authenticated destination when the session is authenticated', () => {
    expect(resolveInitialRoute({ initialized: true, authenticated: true })).toBe('/(tabs)');
  });
});

describe('resolveProtectedRoute', () => {
  it('lets an authenticated visitor reach the requested destination', () => {
    expect(resolveProtectedRoute({ authenticated: true, destination: '/dashboard' })).toBe(
      '/dashboard',
    );
  });

  it('sends an unauthenticated visitor back to Unlock', () => {
    expect(resolveProtectedRoute({ authenticated: false, destination: '/dashboard' })).toBe(
      '/unlock',
    );
  });
});
