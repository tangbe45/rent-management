/**
 * Runtime authentication state for the single local owner. This state lives
 * only in memory for the current application run: it is never persisted to
 * SQLite (there is intentionally no `isAuthenticated` database flag) and it is
 * never written to SecureStore. A cold start always begins UNAUTHENTICATED.
 */
export class AuthenticationSession {
  private authenticated = false;

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  authenticate(): void {
    this.authenticated = true;
  }

  lock(): void {
    this.authenticated = false;
  }
}
