import { AuthenticationSession } from './authentication-session';

describe('AuthenticationSession', () => {
  it('starts unauthenticated on a cold start', () => {
    expect(new AuthenticationSession().isAuthenticated()).toBe(false);
  });

  it('becomes authenticated after a successful authentication', () => {
    const session = new AuthenticationSession();

    session.authenticate();

    expect(session.isAuthenticated()).toBe(true);
  });

  it('returns to unauthenticated when the application is locked', () => {
    const session = new AuthenticationSession();
    session.authenticate();

    session.lock();

    expect(session.isAuthenticated()).toBe(false);
  });
});
