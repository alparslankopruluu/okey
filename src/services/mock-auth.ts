import type { AuthSession, ProviderStatus } from './contracts';

export class MockAuthAdapter {
  public readonly status: ProviderStatus = {
    mode: 'mock',
    ready: true,
    humanTodo: 'Create Firebase projects and configure anonymous, Apple, and Google authentication.',
  };

  public signInAnonymous(deviceId: string): AuthSession {
    const normalized = deviceId.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48);
    if (normalized.length === 0) throw new Error('A stable device ID is required');
    return { userId: `guest_${normalized}`, provider: 'anonymous', isGuest: true };
  }
}
