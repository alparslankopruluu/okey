import type { ProviderStatus, VoiceState } from './contracts';

export class MockVoiceAdapter {
  public readonly status: ProviderStatus = {
    mode: 'mock',
    ready: true,
    humanTodo: 'Create a RealtimeKit account, issue server-side room tokens, and complete microphone/device acceptance.',
  };

  private state: VoiceState = { joined: false, muted: true, pushToTalkActive: false, recordingEnabled: false };

  public join(permission: 'granted' | 'denied'): VoiceState {
    this.state = permission === 'granted'
      ? { ...this.state, joined: true, muted: true }
      : { ...this.state, joined: false, muted: true, pushToTalkActive: false };
    return this.state;
  }

  public setPushToTalk(active: boolean): VoiceState {
    this.state = { ...this.state, pushToTalkActive: this.state.joined && active, muted: !(this.state.joined && active) };
    return this.state;
  }

  public current(): VoiceState {
    return this.state;
  }
}
