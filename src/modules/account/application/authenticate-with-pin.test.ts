import { AuthenticateWithPin } from './authenticate-with-pin';
import { AuthenticationSession } from './authentication-session';

function buildUseCase(verified: boolean) {
  const execute = jest.fn().mockResolvedValue(verified);
  const session = new AuthenticationSession();
  const useCase = new AuthenticateWithPin({
    verifyCredential: { execute },
    session,
  });
  return { execute, session, useCase };
}

describe('AuthenticateWithPin', () => {
  it('establishes the authenticated runtime state when the correct PIN is verified', async () => {
    const { useCase, execute, session } = buildUseCase(true);

    await expect(useCase.execute({ pin: '1234' })).resolves.toBe(true);

    expect(execute).toHaveBeenCalledWith({ pin: '1234' });
    expect(session.isAuthenticated()).toBe(true);
  });

  it('keeps the owner unauthenticated when the PIN is rejected', async () => {
    const { useCase, execute, session } = buildUseCase(false);

    await expect(useCase.execute({ pin: '9999' })).resolves.toBe(false);

    expect(execute).toHaveBeenCalledWith({ pin: '9999' });
    expect(session.isAuthenticated()).toBe(false);
  });

  it.each(['', '12', '12345', '12ab', 'abcd', '12 3'])(
    'rejects the invalid PIN %p without verifying the credential',
    async (pin) => {
      const { useCase, execute, session } = buildUseCase(true);

      await expect(useCase.execute({ pin })).resolves.toBe(false);

      expect(execute).not.toHaveBeenCalled();
      expect(session.isAuthenticated()).toBe(false);
    },
  );
});
